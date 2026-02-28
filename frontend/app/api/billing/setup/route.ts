import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { createOrGetStripeCustomer } from '@/lib/stripe/billing'
import { getStripe } from '@/lib/stripe/client'

/**
 * POST /api/billing/setup
 * Creates a Stripe Checkout session for metered subscription setup.
 * Returns { url } for the hosted checkout page.
 */
export async function POST() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    // Create or get Stripe customer first
    const customerId = await createOrGetStripeCustomer(user.id, user.email)

    // Create Checkout session for metered subscription
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
        },
      ],
      payment_method_types: ['card'],
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/dashboard?billing=canceled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          app: 'elendil',
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Billing] Setup failed:', err)
    const message = err instanceof Error ? err.message : 'Billing setup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
