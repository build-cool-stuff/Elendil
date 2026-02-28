import { NextRequest, NextResponse } from 'next/server'
import { emitScanMeterEvent } from '@/lib/stripe/billing'

/**
 * POST /api/billing/emit-usage
 * Internal endpoint called fire-and-forget from Edge handlers.
 * Handles Node-only Stripe SDK meterEvents.create() call.
 *
 * Protected by INTERNAL_API_KEY header.
 */
export async function POST(request: NextRequest) {
  // Validate internal API key
  const apiKey = request.headers.get('x-internal-api-key')
  const expectedKey = process.env.INTERNAL_API_KEY

  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    user_id: string
    stripe_customer_id: string
    event_id: string
    scan_id?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.user_id || !body.stripe_customer_id || !body.event_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    await emitScanMeterEvent({
      userId: body.user_id,
      stripeCustomerId: body.stripe_customer_id,
      eventId: body.event_id,
      scanId: body.scan_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[emit-usage] Failed:', err)
    return NextResponse.json({ error: 'Failed to emit usage' }, { status: 500 })
  }
}
