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

  // Get or create a portal configuration with full feature set
  let configurationId: string | undefined
  try {
    const configs = await stripe.billingPortal.configurations.list({ limit: 1 })
    if (configs.data.length > 0) {
      configurationId = configs.data[0].id
    } else {
      // Create portal configuration with invoice history, payment methods, and cancellation
      const config = await stripe.billingPortal.configurations.create({
        business_profile: {
          headline: 'Manage your Elendil billing',
        },
        features: {
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: {
            enabled: true,
            mode: 'at_period_end',
            cancellation_reason: {
              enabled: true,
              options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
            },
          },
          customer_update: {
            enabled: true,
            allowed_updates: ['email'],
          },
        },
      })
      configurationId = config.id
    }
  } catch (err) {
    console.error('[Portal] Failed to get/create configuration:', err)
    // Proceed without custom config — Stripe will use default
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${appUrl}/dashboard/billing`,
    ...(configurationId && { configuration: configurationId }),
  })

  return NextResponse.json({ url: session.url })
}
