import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

/**
 * Returns a singleton Stripe SDK instance.
 * Only usable in Node.js runtime (not Edge).
 */
export function getStripe(): Stripe {
  if (stripeInstance) return stripeInstance

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable')
  }

  stripeInstance = new Stripe(secretKey, {
    typescript: true,
    maxNetworkRetries: 1,
    timeout: 20000,
  })

  return stripeInstance
}
