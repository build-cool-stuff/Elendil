import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle management.
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
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id

      // Upsert billing subscription
      await supabase
        .from('billing_subscriptions')
        .upsert(
          {
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

      // Update billing_active flag on user
      const isActive = ['active', 'trialing'].includes(subscription.status)
      await supabase
        .from('users')
        .update({ billing_active: isActive })
        .eq('stripe_customer_id', customerId)

      console.log(`[Stripe] Subscription ${subscription.status}: ${subscription.id}`)
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

      // Check if user has any other active subscriptions
      const { count } = await supabase
        .from('billing_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('stripe_subscription_id', subscription.id)
        .in('status', ['active', 'trialing'])

      if (!count || count === 0) {
        await supabase
          .from('users')
          .update({ billing_active: false })
          .eq('stripe_customer_id', customerId)
      }

      console.log(`[Stripe] Subscription canceled: ${subscription.id}`)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      console.log(`[Stripe] Invoice paid: ${invoice.id}, amount: ${invoice.amount_paid}`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id

      console.error(`[Stripe] Invoice payment failed: ${invoice.id}, customer: ${customerId}`)

      // Update subscription status to past_due if applicable
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
      break
    }

    default:
      console.log(`[Stripe] Unhandled event: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
