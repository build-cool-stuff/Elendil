/**
 * Edge-compatible Supabase client
 * Uses service role for public scan recording endpoint
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let edgeClient: SupabaseClient | null = null

/**
 * Creates an Edge-compatible Supabase client using service role credentials.
 * This client is used for public endpoints (QR scan tracking) where user
 * authentication is not required.
 *
 * Features:
 * - No session persistence (stateless for Edge)
 * - Uses native fetch (Edge-compatible)
 * - Service role bypasses RLS for scan insertion
 */
export function createEdgeClient(): SupabaseClient {
  if (edgeClient) {
    return edgeClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for Edge client')
  }

  edgeClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetch, // Use Edge-native fetch
    },
  })

  return edgeClient
}

/**
 * Campaign data returned from Edge lookup
 */
export interface EdgeCampaignData {
  id: string
  name: string
  destination_url: string
  tracking_code: string
  slug: string | null
  cookie_duration_days: number
  bridge_enabled: boolean
  bridge_duration_ms: number
  custom_domain: string | null
  status: string
  user_id: string
  meta_pixel_id: string | null
  meta_access_token: string | null
  encrypted_access_token: string | null
  encryption_iv: string | null
}

/**
 * Lookup campaign by slug or tracking code
 * Returns campaign data with Meta integration info if available
 */
export async function lookupCampaign(
  slugOrCode: string
): Promise<EdgeCampaignData | null> {
  const supabase = createEdgeClient()
  const normalizedCode = slugOrCode.toLowerCase()

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      destination_url,
      tracking_code,
      slug,
      cookie_duration_days,
      bridge_enabled,
      bridge_duration_ms,
      custom_domain,
      status,
      user_id,
      users!inner (
        meta_integrations (
          pixel_id,
          access_token,
          encrypted_access_token,
          encryption_iv,
          status
        )
      )
    `)
    .or(`slug.eq.${normalizedCode},tracking_code.eq.${normalizedCode}`)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return null
  }

  // Extract Meta integration from nested response
  const metaIntegration = (data.users as any)?.meta_integrations?.[0]
  const isMetaActive = metaIntegration?.status === 'active'

  return {
    id: data.id,
    name: data.name,
    destination_url: data.destination_url,
    tracking_code: data.tracking_code,
    slug: data.slug,
    cookie_duration_days: data.cookie_duration_days || 30,
    bridge_enabled: data.bridge_enabled ?? true,
    bridge_duration_ms: data.bridge_duration_ms || 800,
    custom_domain: data.custom_domain,
    status: data.status,
    user_id: data.user_id,
    meta_pixel_id: isMetaActive ? metaIntegration?.pixel_id : null,
    meta_access_token: isMetaActive ? metaIntegration?.access_token : null,
    encrypted_access_token: isMetaActive ? metaIntegration?.encrypted_access_token : null,
    encryption_iv: isMetaActive ? metaIntegration?.encryption_iv : null,
  }
}

/**
 * Lookup suburb by postcode
 */
export async function lookupSuburbByPostcode(
  postcode: string
): Promise<{ name: string; state: string } | null> {
  const supabase = createEdgeClient()

  const { data, error } = await supabase
    .from('suburbs')
    .select('name, state')
    .eq('postcode', postcode)
    .order('population', { ascending: false, nullsFirst: false })
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return {
    name: data.name,
    state: data.state,
  }
}

/**
 * Record a scan event (non-blocking)
 * Returns immediately, scan is recorded asynchronously
 */
export async function recordScan(scanData: {
  campaign_id: string
  visitor_id: string
  ip_address_hash: string
  latitude: number | null
  longitude: number | null
  suburb: string | null
  postcode: string | null
  state: string | null
  country: string
  user_agent: string
  device_type: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
  referrer: string | null
  cookie_expires_at: string
  is_first_scan: boolean
  meta_event_id: string | null
}): Promise<void> {
  const supabase = createEdgeClient()

  // Fire and forget - don't await
  supabase
    .from('scans')
    .insert({
      ...scanData,
      scanned_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch((err) => {
      console.error('[Edge] Failed to record scan:', err)
    })
}
