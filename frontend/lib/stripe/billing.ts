import { getStripe } from './client'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Create or retrieve a Stripe customer for a user.
 * Idempotent: checks stripe_customer_id first.
 */
export async function createOrGetStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = createServerClient()

  // Check if user already has a Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (user?.stripe_customer_id) {
    return user.stripe_customer_id
  }

  // Create new Stripe customer
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
      app: 'elendil',
    },
  })

  // Save customer ID to users table
  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

/**
 * Attach a payment method to a customer and set as default.
 */
export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  const stripe = getStripe()

  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  })

  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  })
}

/**
 * Create a metered subscription for a customer.
 */
export async function createMeterSubscription(
  customerId: string
): Promise<string> {
  const stripe = getStripe()
  const priceId = process.env.STRIPE_PRICE_ID

  if (!priceId) {
    throw new Error('Missing STRIPE_PRICE_ID environment variable')
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
  })

  return subscription.id
}

/**
 * Emit a scan meter event to Stripe.
 * Write-ahead: inserts scan_usage_events row first, then calls Stripe.
 */
export async function emitScanMeterEvent(params: {
  userId: string
  stripeCustomerId: string
  eventId: string
  scanId?: string
}): Promise<void> {
  const { userId, stripeCustomerId, eventId, scanId } = params
  const idempotencyKey = `scan_${eventId}`
  const supabase = createServerClient()

  // Write-ahead: insert pending event
  const { error: insertError } = await supabase
    .from('scan_usage_events')
    .insert({
      scan_id: scanId || null,
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      idempotency_key: idempotencyKey,
      status: 'pending',
      quantity: 1,
    })

  if (insertError) {
    // Duplicate idempotency key means already processed
    if (insertError.code === '23505') {
      console.log(`[Billing] Duplicate meter event skipped: ${idempotencyKey}`)
      return
    }
    console.error('[Billing] Failed to insert usage event:', insertError)
    return
  }

  // Call Stripe Billing Meters API
  try {
    const stripe = getStripe()
    const meterEventName = process.env.STRIPE_METER_EVENT_NAME || 'qr_scan'

    await stripe.billing.meterEvents.create({
      event_name: meterEventName,
      payload: {
        value: '1',
        stripe_customer_id: stripeCustomerId,
      },
      identifier: idempotencyKey,
      timestamp: Math.floor(Date.now() / 1000),
    })

    // Mark as sent
    await supabase
      .from('scan_usage_events')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('idempotency_key', idempotencyKey)

    console.log(`[Billing] Meter event sent: ${idempotencyKey}`)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[Billing] Meter event failed: ${idempotencyKey}`, errorMessage)

    // Mark as failed for retry
    await supabase
      .from('scan_usage_events')
      .update({
        status: 'failed',
        last_error: errorMessage,
        retry_count: 1,
      })
      .eq('idempotency_key', idempotencyKey)
  }
}
