import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createServerClient } from '@/lib/supabase/server'

export const maxDuration = 30

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle management.
 * Includes grace period logic for payment failures.
 * Signature-verified, no auth required.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServerClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      console.log(`[Stripe] Checkout completed: ${session.id}, customer: ${session.customer}, subscription: ${session.subscription}`)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, grace_period_end')
        .eq('stripe_customer_id', customerId)
        .single()

      if (userError || !user) {
        console.error(`[Stripe] User not found for customer ${customerId}:`, userError?.message)
        return NextResponse.json({ received: true, warning: 'user_not_found' })
      }

      // Upsert billing subscription
      const { error: upsertError } = await supabase
        .from('billing_subscriptions')
        .upsert(
          {
            user_id: user.id,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0]?.price?.id || null,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            ended_at: subscription.ended_at
              ? new Date(subscription.ended_at * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'stripe_subscription_id' }
        )

      if (upsertError) {
        console.error(`[Stripe] Failed to upsert subscription:`, upsertError)
      }

      const isActive = ['active', 'trialing'].includes(subscription.status)

      // Build user update
      const userUpdate: Record<string, unknown> = { billing_active: isActive }

      if (isActive) {
        // Subscription is active — clear any grace period / degraded state
        userUpdate.grace_period_end = null
        userUpdate.degraded_since = null
      } else if (subscription.status === 'past_due' && !user.grace_period_end) {
        // Subscription went past_due — set grace period if not already set
        // (handles race with invoice.payment_failed)
        const gracePeriodEnd = new Date()
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 1) // 24 hours
        userUpdate.grace_period_end = gracePeriodEnd.toISOString()
        console.log(`[Stripe] Grace period set via subscription.updated (past_due): ${customerId}`)
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(userUpdate)
        .eq('stripe_customer_id', customerId)

      if (updateError) {
        console.error(`[Stripe] Failed to update user:`, updateError)
      }

      console.log(`[Stripe] Subscription ${subscription.status}: ${subscription.id}, user: ${user.id}, billing_active: ${isActive}`)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      await supabase
        .from('billing_subscriptions')
        .update({
          status: 'canceled',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (user) {
        const { count } = await supabase
          .from('billing_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])

        if (!count || count === 0) {
          // No active subscriptions — immediate degradation (no grace for voluntary cancel)
          await supabase
            .from('users')
            .update({
              billing_active: false,
              degraded_since: new Date().toISOString(),
              grace_period_end: null,
            })
            .eq('stripe_customer_id', customerId)
        }
      }

      console.log(`[Stripe] Subscription canceled: ${subscription.id}`)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer as Stripe.Customer)?.id

      // Payment succeeded — clear grace period and degraded state
      if (customerId) {
        await supabase
          .from('users')
          .update({
            billing_active: true,
            grace_period_end: null,
            degraded_since: null,
          })
          .eq('stripe_customer_id', customerId)
      }

      console.log(`[Stripe] Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}, grace cleared`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer as Stripe.Customer)?.id

      console.error(`[Stripe] Invoice payment failed: ${invoice.id}, customer: ${customerId}`)

      if (invoice.subscription) {
        const subId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription.id

        await supabase
          .from('billing_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subId)
      }

      // Set 1-day grace period — only on first failure (don't reset clock on retries)
      if (customerId) {
        const { data: user } = await supabase
          .from('users')
          .select('grace_period_end')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user && !user.grace_period_end) {
          const gracePeriodEnd = new Date()
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 1) // 24 hours
          await supabase
            .from('users')
            .update({ grace_period_end: gracePeriodEnd.toISOString() })
            .eq('stripe_customer_id', customerId)

          console.log(`[Stripe] Grace period set: ${customerId}, expires: ${gracePeriodEnd.toISOString()}`)
        }
      }
      break
    }

    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
