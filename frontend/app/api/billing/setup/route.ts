import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  createOrGetStripeCustomer,
  attachPaymentMethod,
  createMeterSubscription,
} from '@/lib/stripe/billing'

/**
 * POST /api/billing/setup
 * Sets up billing for a user: creates Stripe customer, attaches payment method,
 * creates metered subscription.
 */
export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { payment_method_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.payment_method_id) {
    return NextResponse.json({ error: 'payment_method_id is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Get user from Supabase
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('clerk_id', clerkId)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    // 1. Create or get Stripe customer
    const customerId = await createOrGetStripeCustomer(user.id, user.email)

    // 2. Attach payment method
    await attachPaymentMethod(customerId, body.payment_method_id)

    // 3. Create metered subscription
    const subscriptionId = await createMeterSubscription(customerId)

    // 4. Insert billing subscription record
    await supabase.from('billing_subscriptions').insert({
      user_id: user.id,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: process.env.STRIPE_PRICE_ID,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // 5. Activate billing on user
    await supabase
      .from('users')
      .update({
        stripe_customer_id: customerId,
        billing_active: true,
      })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      customer_id: customerId,
      subscription_id: subscriptionId,
    })
  } catch (err) {
    console.error('[Billing] Setup failed:', err)
    const message = err instanceof Error ? err.message : 'Billing setup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
