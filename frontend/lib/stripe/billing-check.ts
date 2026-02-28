/**
 * Edge-compatible billing gate.
 *
 * Determines whether a campaign should get premium tracking features
 * (Meta Pixel, CAPI, BigDataCloud precision geo, suburb lookup) or
 * degrade to a basic QR redirect.
 *
 * Degraded when:
 * - billing_active is false AND not in grace period
 * - accrued spend in current period >= $5,000 AUD
 *
 * Grace period: 24 hours after first payment failure. Premium features
 * continue working, but user sees urgent warning. After grace expires,
 * degraded_since is set and features shut off.
 *
 * Degraded mode: QR code still redirects to destination, still records
 * basic scan (device, Vercel geo), but no Meta Pixel, no CAPI, no
 * BigDataCloud, no suburb lookup.
 */

import { createEdgeClient } from '@/lib/edge/supabase-edge'

/** $5,000 AUD spend cap per billing period */
const SPEND_CAP_AUD = 5000
/** $20 AUD per scan */
const PRICE_PER_SCAN_AUD = 20

export interface BillingCheckResult {
  billing_active: boolean
  /** true = no premium features (Meta, BigDataCloud, suburb lookup) */
  degraded: boolean
  /** true = premium still works but payment is overdue */
  in_grace_period: boolean
  /** when grace period expires (ISO string) */
  grace_period_end: string | null
  scan_count: number
  accrued_spend_aud: number
}

/**
 * Check billing status from campaign data already loaded by lookupCampaign().
 * Only ONE extra query: count usage events in current billing period.
 */
export async function checkBillingFromCampaign(campaignData: {
  user_id: string
  billing_active: boolean
  stripe_customer_id: string | null
  grace_period_end: string | null
}): Promise<BillingCheckResult> {
  const { billing_active, grace_period_end } = campaignData

  // If billing is not active, check grace period
  if (!billing_active) {
    const inGrace = !!(grace_period_end && new Date(grace_period_end) > new Date())

    return {
      billing_active: false,
      degraded: !inGrace,
      in_grace_period: inGrace,
      grace_period_end,
      scan_count: 0,
      accrued_spend_aud: 0,
    }
  }

  // Billing is active — check spend cap
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const supabase = createEdgeClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', campaignData.user_id)

  const campaignIds = (campaigns || []).map((c) => c.id)
  if (campaignIds.length === 0) {
    return {
      billing_active: true,
      degraded: false,
      in_grace_period: false,
      grace_period_end: null,
      scan_count: 0,
      accrued_spend_aud: 0,
    }
  }

  // Only count first scans per device per campaign (cookie-based dedup)
  const { count, error } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', campaignIds)
    .gte('scanned_at', periodStart)
    .eq('is_first_scan', true)

  if (error) {
    console.error('[Billing] Failed to count usage:', error)
    // Fail open — allow full features through
    return {
      billing_active: true,
      degraded: false,
      in_grace_period: false,
      grace_period_end: null,
      scan_count: 0,
      accrued_spend_aud: 0,
    }
  }

  const scanCount = count || 0
  const accruedSpendAud = scanCount * PRICE_PER_SCAN_AUD
  const degraded = accruedSpendAud >= SPEND_CAP_AUD

  if (degraded) {
    console.warn(`[Billing] Spend cap reached: $${accruedSpendAud} AUD (${scanCount} scans)`)
  }

  return {
    billing_active: true,
    degraded,
    in_grace_period: false,
    grace_period_end: null,
    scan_count: scanCount,
    accrued_spend_aud: accruedSpendAud,
  }
}
