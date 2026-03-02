import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'

const MAX_RETRIES = 5

/**
 * GET /api/cron/retry-usage
 * Retries failed scan_usage_events. Called by Vercel Cron (daily at midnight UTC).
 * Inline retries also happen via /api/billing/status on every poll (~5s per active user).
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
    || request.nextUrl.searchParams.get('secret')

  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Fetch retryable events
  const { data: events, error } = await supabase
    .from('scan_usage_events')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('retry_count', MAX_RETRIES)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[Cron] Failed to fetch retryable events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const stripe = getStripe()
  const meterEventName = process.env.STRIPE_METER_EVENT_NAME || 'qr_scan'
  let sent = 0
  let failed = 0
  let deadLettered = 0

  for (const event of events) {
    try {
      await stripe.billing.meterEvents.create({
        event_name: meterEventName,
        payload: {
          value: '1',
          stripe_customer_id: event.stripe_customer_id,
        },
        identifier: event.idempotency_key,
        timestamp: Math.floor(new Date(event.created_at).getTime() / 1000),
      })

      await supabase
        .from('scan_usage_events')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', event.id)

      sent++
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const newRetryCount = event.retry_count + 1
      const newStatus = newRetryCount >= MAX_RETRIES ? 'dead_letter' : 'failed'

      await supabase
        .from('scan_usage_events')
        .update({
          status: newStatus,
          retry_count: newRetryCount,
          last_error: errorMessage,
        })
        .eq('id', event.id)

      if (newStatus === 'dead_letter') {
        deadLettered++
        console.error(`[Cron] Dead-lettered event: ${event.idempotency_key}`, errorMessage)
      } else {
        failed++
      }
    }
  }

  console.log(`[Cron] Retry results: sent=${sent}, failed=${failed}, dead_letter=${deadLettered}`)
  return NextResponse.json({ processed: events.length, sent, failed, dead_lettered: deadLettered })
}
