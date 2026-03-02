import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * GET /api/cron/enforce-grace
 * Enforces grace period expiry. Finds users whose grace period has elapsed
 * and sets degraded_since to begin tracking missed leads.
 * Called by Vercel Cron (daily at midnight UTC). Inline enforcement also
 * happens via /api/billing/status on every poll (~5s per active user).
 * Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
    || request.nextUrl.searchParams.get('secret')

  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  // Find users whose grace period has expired but haven't been degraded yet
  const { data: expiredUsers, error } = await supabase
    .from('users')
    .select('id, stripe_customer_id')
    .not('grace_period_end', 'is', null)
    .lte('grace_period_end', new Date().toISOString())
    .is('degraded_since', null)

  if (error) {
    console.error('[Cron] Failed to query expired grace periods:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!expiredUsers || expiredUsers.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let degraded = 0
  for (const user of expiredUsers) {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        degraded_since: new Date().toISOString(),
        billing_active: false,
        grace_period_end: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error(`[Cron] Failed to degrade user ${user.id}:`, updateError)
    } else {
      degraded++
      console.log(`[Cron] Grace expired, degraded user: ${user.id}`)
    }
  }

  console.log(`[Cron] Grace enforcement: ${degraded}/${expiredUsers.length} users degraded`)
  return NextResponse.json({ processed: expiredUsers.length, degraded })
}
