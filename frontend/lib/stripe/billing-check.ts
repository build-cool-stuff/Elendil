/**
 * Edge-compatible billing gate.
 *
 * Determines whether a campaign should get premium tracking features
 * (Meta Pixel, CAPI, BigDataCloud precision geo, suburb lookup) or
 * degrade to a basic QR redirect.
 *
 * Degraded when:
 * - billing_active is false (no subscription), OR
 * - accrued spend in current period >= $5,000 AUD
 *
 * Degraded mode: QR code still redirects to destination, still records
 * basic scan (device, Vercel geo), but no Meta Pixel, no CAPI, no
 * BigDataCloud, no suburb lookup.
 *
 * NOTE: This is only called when billing is active. When billing_active
 * is false, the scan flow runs normally (all features enabled) — billing
 * degradation only kicks in when a paying user exceeds the spend cap.
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
}): Promise<BillingCheckResult> {
  const { billing_active } = campaignData

  // If billing is not active, no degradation — all features work
  // (degradation only applies to paying users who exceed the spend cap)
  if (!billing_active) {
    return {
      billing_active: false,
      degraded: false,
      scan_count: 0,
      accrued_spend_aud: 0,
    }
  }

  // Count actual scans in current billing period (calendar month)
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const supabase = createEdgeClient()

  // Get user's campaigns, then count scans directly
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', campaignData.user_id)

  const campaignIds = (campaigns || []).map((c) => c.id)
  if (campaignIds.length === 0) {
    return {
      billing_active: true,
      degraded: false,
      scan_count: 0,
      accrued_spend_aud: 0,
    }
  }

  const { count, error } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .in('campaign_id', campaignIds)
    .gte('scanned_at', periodStart)

  if (error) {
    console.error('[Billing] Failed to count usage:', error)
    // Fail open — allow full features through
    return {
      billing_active: true,
      degraded: false,
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
    scan_count: scanCount,
    accrued_spend_aud: accruedSpendAud,
  }
}
