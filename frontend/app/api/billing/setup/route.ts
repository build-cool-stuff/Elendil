import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { createOrGetStripeCustomer } from '@/lib/stripe/billing'
import { getStripe } from '@/lib/stripe/client'

// Allow up to 30s for this function (cold start + multiple API calls)
export const maxDuration = 30

/**
 * POST /api/billing/setup
 * Creates a Stripe Checkout session for metered subscription setup.
 * Returns { url } for the hosted checkout page.
 */
export async function POST() {
  const start = Date.now()
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log(`[Billing] Auth took ${Date.now() - start}ms`)

  const supabase = createServerClient()

  // Get user from Supabase
  const t1 = Date.now()
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('clerk_id', clerkId)
    .single()
  console.log(`[Billing] User lookup took ${Date.now() - t1}ms`, { found: !!user, error: userError?.message })

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Step 1: Create or get Stripe customer
  const t2 = Date.now()
  let customerId: string
  try {
    customerId = await createOrGetStripeCustomer(user.id, user.email)
    console.log(`[Billing] Customer took ${Date.now() - t2}ms, id: ${customerId}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Billing] Customer creation failed after ${Date.now() - t2}ms:`, msg)
    return NextResponse.json(
      { error: `Customer setup failed: ${msg}` },
      { status: 500 }
    )
  }

  // Step 2: Create Checkout session
  const t3 = Date.now()
  try {
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
      success_url: `${appUrl}/dashboard/billing?billing=success`,
      cancel_url: `${appUrl}/dashboard/billing?billing=canceled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          app: 'elendil',
        },
      },
    })
    console.log(`[Billing] Checkout session took ${Date.now() - t3}ms, total: ${Date.now() - start}ms`)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Billing] Checkout session failed after ${Date.now() - t3}ms:`, msg)
    return NextResponse.json(
      { error: `Checkout failed: ${msg}` },
      { status: 500 }
    )
  }
}
