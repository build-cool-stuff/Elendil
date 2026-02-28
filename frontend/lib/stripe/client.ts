import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Returns a singleton Stripe SDK instance.
 * Only usable in Node.js runtime (not Edge).
 */
export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    typescript: true,
  })

  return stripeInstance
}
