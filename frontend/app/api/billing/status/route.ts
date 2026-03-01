import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

export const maxDuration = 30

const PRICE_PER_SCAN_AUD = 20

/**
 * GET /api/billing/status
 * Returns billing status, usage count, accrued spend, and next invoice preview.
 * Spend cap values are now per-user (spend_cap_enabled + spend_cap_amount_aud).
 */
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Get user with billing info — includes spend cap settings
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, stripe_customer_id, billing_active, grace_period_end, degraded_since, spend_cap_enabled, spend_cap_amount_aud')
    .eq('clerk_id', clerkId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Per-user spend cap settings (defaults match migration 010)
  const spendCapEnabled = user.spend_cap_enabled ?? true
  const spendCapAud = user.spend_cap_amount_aud ?? 5000

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

        // Update billing_active on user and clear degradation state
        if (isActive && !user.billing_active) {
          await supabase
            .from('users')
            .update({
              billing_active: true,
              degraded_since: null,
              grace_period_end: null,
            })
            .eq('id', user.id)
          user.billing_active = true
          user.degraded_since = null
          user.grace_period_end = null
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

  // Get user's campaign IDs for scan counting
  const { data: userCampaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', user.id)

  const campaignIds = (userCampaigns || []).map((c) => c.id)

  // Count unique scans (first visit per device per campaign) for billing.
  // Repeat scans from the same device within the cookie window are not billed.
  // When the cookie expires (30/60/90 days), the next scan counts as new.
  let currentScanCount = 0
  if (campaignIds.length > 0) {
    const { count: scanCount } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('scanned_at', periodStart)
      .eq('is_first_scan', true)

    currentScanCount = scanCount || 0
  }
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

  // Grace period status
  const inGrace = !!(user.grace_period_end && new Date(user.grace_period_end) > new Date())
  let graceHoursRemaining: number | null = null
  if (inGrace && user.grace_period_end) {
    graceHoursRemaining = Math.max(0,
      (new Date(user.grace_period_end).getTime() - Date.now()) / (1000 * 60 * 60)
    )
  }

  // Count missed leads (scans since degradation started)
  let missedLeadsCount = 0
  if (user.degraded_since && campaignIds.length > 0) {
    const { count: missedCount } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('scanned_at', user.degraded_since)
      .eq('is_first_scan', true)

    missedLeadsCount = missedCount || 0
  }

  // Degraded if:
  // - billing inactive (and not in grace period), OR
  // - spend cap enabled AND accrued spend >= user's cap amount
  const degraded =
    (!user.billing_active && !inGrace) ||
    (spendCapEnabled && accruedSpendAud >= spendCapAud)

  return NextResponse.json({
    billing_active: user.billing_active,
    stripe_customer_id: user.stripe_customer_id,
    degraded,
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
      spend_cap_aud: spendCapAud,
      spend_cap_enabled: spendCapEnabled,
      price_per_scan_aud: PRICE_PER_SCAN_AUD,
    },
    upcoming_invoice: upcomingInvoice,
    grace_period: inGrace
      ? {
          active: true,
          ends_at: user.grace_period_end,
          hours_remaining: graceHoursRemaining,
        }
      : null,
    degraded_since: user.degraded_since,
    missed_leads_count: missedLeadsCount,
  })
}
