import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

export const maxDuration = 30

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session and returns the URL.
 */
export async function POST() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('clerk_id', clerkId)
    .single()

  if (!user?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${appUrl}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
