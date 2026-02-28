import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

export const maxDuration = 30

const PRICE_PER_SCAN_AUD = 20
const SPEND_CAP_AUD = 5000

/**
 * GET /api/billing/status
 * Returns billing status, usage count, accrued spend, and next invoice preview.
 */
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Get user with billing info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, stripe_customer_id, billing_active')
    .eq('clerk_id', clerkId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get active subscription from DB
  let { data: subscription } = await supabase
    .from('billing_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Self-healing: if customer exists in Stripe but no subscription in DB,
  // check Stripe directly and sync (handles webhook delivery failures)
  if (!subscription && user.stripe_customer_id) {
    try {
      const stripe = getStripe()
      const stripeSubs = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'active',
        limit: 1,
      })

      if (stripeSubs.data.length > 0) {
        const stripeSub = stripeSubs.data[0]
        const isActive = ['active', 'trialing'].includes(stripeSub.status)

        // Sync subscription to DB
        const subRecord = {
          user_id: user.id,
          stripe_subscription_id: stripeSub.id,
          stripe_price_id: stripeSub.items.data[0]?.price?.id || null,
          status: stripeSub.status,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          canceled_at: stripeSub.canceled_at
            ? new Date(stripeSub.canceled_at * 1000).toISOString()
            : null,
          ended_at: stripeSub.ended_at
            ? new Date(stripeSub.ended_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        }

        await supabase
          .from('billing_subscriptions')
          .upsert(subRecord, { onConflict: 'stripe_subscription_id' })

        // Update billing_active on user
        if (isActive && !user.billing_active) {
          await supabase
            .from('users')
            .update({ billing_active: true })
            .eq('id', user.id)
          user.billing_active = true
        }

        // Use the synced subscription for the response
        subscription = {
          ...subRecord,
          id: stripeSub.id,
          created_at: new Date().toISOString(),
        } as typeof subscription

        console.log(`[Billing] Self-healed: synced subscription ${stripeSub.id} for user ${user.id}`)
      }
    } catch (err) {
      console.error('[Billing] Self-heal Stripe check failed:', err)
    }
  }

  // Count usage in current period
  const periodStart = subscription?.current_period_start
    || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const { count: scanCount } = await supabase
    .from('scan_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', periodStart)
    .neq('status', 'dead_letter')

  const currentScanCount = scanCount || 0
  const accruedSpendAud = currentScanCount * PRICE_PER_SCAN_AUD

  // Get upcoming invoice preview if customer exists
  let upcomingInvoice = null
  if (user.stripe_customer_id) {
    try {
      const stripe = getStripe()
      const invoice = await stripe.invoices.retrieveUpcoming({
        customer: user.stripe_customer_id,
      })
      upcomingInvoice = {
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        period_end: invoice.period_end,
      }
    } catch {
      // No upcoming invoice (e.g., no active subscription)
    }
  }

  return NextResponse.json({
    billing_active: user.billing_active,
    stripe_customer_id: user.stripe_customer_id,
    degraded: !user.billing_active || accruedSpendAud >= SPEND_CAP_AUD,
    subscription: subscription
      ? {
          id: subscription.stripe_subscription_id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }
      : null,
    usage: {
      scan_count: currentScanCount,
      accrued_spend_aud: accruedSpendAud,
      spend_cap_aud: SPEND_CAP_AUD,
      price_per_scan_aud: PRICE_PER_SCAN_AUD,
    },
    upcoming_invoice: upcomingInvoice,
  })
}
