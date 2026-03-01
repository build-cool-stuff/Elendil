/**
 * Edge-compatible billing gate.
 *
 * Determines whether a campaign should get premium tracking features
 * (Meta Pixel, CAPI, BigDataCloud precision geo, suburb lookup) or
 * degrade to a basic QR redirect.
 *
 * Degraded when:
 * - billing_active is false AND not in grace period
 * - spend_cap_enabled is true AND accrued spend >= spend_cap_amount_aud
 *
 * When spend_cap_enabled is false, no spend-based degradation occurs —
 * premium features continue regardless of accrued charges.
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

/** $20 AUD per scan — fixed price, not configurable per-user */
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
  /** whether the spend cap is being enforced for this user */
  spend_cap_enforced: boolean
}

/**
 * Check billing status from campaign data already loaded by lookupCampaign().
 *
 * When spend_cap_enabled is true, runs two extra queries (campaign IDs + scan count)
 * in the current billing period and compares against spend_cap_amount_aud.
 *
 * When spend_cap_enabled is false, skips the count query entirely —
 * no performance penalty for users who opt out of the cap.
 */
export async function checkBillingFromCampaign(campaignData: {
  user_id: string
  billing_active: boolean
  stripe_customer_id: string | null
  grace_period_end: string | null
  spend_cap_enabled: boolean
  spend_cap_amount_aud: number
}): Promise<BillingCheckResult> {
  const { billing_active, grace_period_end, spend_cap_enabled, spend_cap_amount_aud } = campaignData

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
      spend_cap_enforced: spend_cap_enabled,
    }
  }

  // Billing is active — if spend cap is OFF, skip the count query entirely
  if (!spend_cap_enabled) {
    return {
      billing_active: true,
      degraded: false,
      in_grace_period: false,
      grace_period_end: null,
      scan_count: 0,
      accrued_spend_aud: 0,
      spend_cap_enforced: false,
    }
  }

  // Spend cap is ON — count first-scans to check against the cap
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
      spend_cap_enforced: true,
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
      spend_cap_enforced: true,
    }
  }

  const scanCount = count || 0
  const accruedSpendAud = scanCount * PRICE_PER_SCAN_AUD
  const degraded = accruedSpendAud >= spend_cap_amount_aud

  if (degraded) {
    console.warn(
      `[Billing] Spend cap reached: $${accruedSpendAud} AUD / $${spend_cap_amount_aud} AUD cap (${scanCount} scans)`
    )
  }

  return {
    billing_active: true,
    degraded,
    in_grace_period: false,
    grace_period_end: null,
    scan_count: scanCount,
    accrued_spend_aud: accruedSpendAud,
    spend_cap_enforced: true,
  }
}
