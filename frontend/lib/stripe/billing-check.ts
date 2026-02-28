/**
 * Edge-compatible billing gate.
 * Uses billing fields already embedded in EdgeCampaignData (zero extra queries for billing status).
 * Only requires ONE additional query: counting scan_usage_events in the current period.
 */

import { createEdgeClient } from '@/lib/edge/supabase-edge'

export interface BillingCheckResult {
  billing_active: boolean
  over_soft_cap: boolean
  over_hard_cap: boolean
  scan_count: number
  limit: number
}

/**
 * Check billing status from campaign data already loaded by lookupCampaign().
 * Only ONE extra query: count usage events in current billing period.
 */
export async function checkBillingFromCampaign(campaignData: {
  user_id: string
  billing_active: boolean
  stripe_customer_id: string | null
  monthly_scan_limit: number
  cap_override: boolean
  current_period_start: string | null
}): Promise<BillingCheckResult> {
  const {
    billing_active,
    monthly_scan_limit,
    cap_override,
    current_period_start,
  } = campaignData

  // If billing is not active, short-circuit
  if (!billing_active) {
    return {
      billing_active: false,
      over_soft_cap: false,
      over_hard_cap: false,
      scan_count: 0,
      limit: monthly_scan_limit,
    }
  }

  // If admin override, skip cap checks
  if (cap_override) {
    return {
      billing_active: true,
      over_soft_cap: false,
      over_hard_cap: false,
      scan_count: 0,
      limit: monthly_scan_limit,
    }
  }

  // Count usage events in current billing period
  const periodStart = current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const supabase = createEdgeClient()

  const { count, error } = await supabase
    .from('scan_usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', campaignData.user_id)
    .gte('created_at', periodStart)
    .neq('status', 'dead_letter')

  if (error) {
    console.error('[Billing] Failed to count usage:', error)
    // Fail open - allow the scan through
    return {
      billing_active: true,
      over_soft_cap: false,
      over_hard_cap: false,
      scan_count: 0,
      limit: monthly_scan_limit,
    }
  }

  const scanCount = count || 0
  const softCapThreshold = Math.floor(monthly_scan_limit * 0.8)

  return {
    billing_active: true,
    over_soft_cap: scanCount >= softCapThreshold,
    over_hard_cap: scanCount >= monthly_scan_limit,
    scan_count: scanCount,
    limit: monthly_scan_limit,
  }
}
