/**
 * Precision Tracking API Endpoint
 *
 * Uses BigDataCloud for suburb-level geolocation precision.
 * Called from the bridge page to record scans with granular location data.
 *
 * Route: POST /api/go/[slug]/track
 * Runtime: Edge
 */

export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { createEdgeClient, lookupCampaign } from '@/lib/edge/supabase-edge'
import { extractClientIP, extractGeoFromHeaders } from '@/lib/edge/geo'
import { parseUserAgent } from '@/lib/edge/user-agent'
import {
  getOrCreateVisitorId,
  hasVisitedCampaign,
  parseCookies,
  calculateCookieExpiry,
} from '@/lib/edge/cookies'
import { hashIPAddress, generateEventId } from '@/lib/edge/encryption'
import {
  fetchPrecisionGeo,
  mergeWithVercelFallback,
  getConfidenceLevel,
} from '@/lib/edge/bigdatacloud'
import {
  fireQRCodeScanEvent,
  extractFacebookCookies,
} from '@/lib/edge/meta-capi'

interface TrackRequest {
  event_id?: string
  referrer?: string
  screen_width?: number
  screen_height?: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now()
  const { slug } = await params

  // Parse request body
  let body: TrackRequest = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional
  }

  // 1. Lookup campaign
  const campaign = await lookupCampaign(slug)

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // 2. Extract request data
  const headers = request.headers
  const cookieHeader = headers.get('cookie') || ''
  const userAgent = headers.get('user-agent') || ''
  const clientIP = extractClientIP(headers)

  // 3. Get precision geolocation from BigDataCloud
  const precisionGeo = await fetchPrecisionGeo(clientIP)

  // 4. Merge with Vercel headers as fallback
  const vercelGeo = extractGeoFromHeaders(headers)
  const finalGeo = mergeWithVercelFallback(precisionGeo, {
    city: vercelGeo.city,
    postalCode: vercelGeo.postalCode,
    countryRegion: vercelGeo.countryRegion,
    country: vercelGeo.country,
    latitude: vercelGeo.latitude,
    longitude: vercelGeo.longitude,
  })

  // 5. Parse device info
  const device = parseUserAgent(userAgent)

  // Skip bot tracking
  if (device.is_bot) {
    console.log(`[Track] Bot detected, skipping: ${userAgent}`)
    return NextResponse.json({ success: true, skipped: true, reason: 'bot' })
  }

  // Skip VPN/Proxy if detected (optional - can be configured)
  if (finalGeo.is_vpn || finalGeo.is_proxy || finalGeo.is_tor) {
    console.log(`[Track] VPN/Proxy detected: vpn=${finalGeo.is_vpn}, proxy=${finalGeo.is_proxy}, tor=${finalGeo.is_tor}`)
    // Still track but flag it
  }

  // 6. Cookie management
  const { visitorId, isNew: isFirstScan } = getOrCreateVisitorId(cookieHeader)
  const isFirstCampaignVisit = !hasVisitedCampaign(cookieHeader, campaign.id)
  const cookieExpiry = calculateCookieExpiry(campaign.cookie_duration_days)

  // 7. Use provided event_id or generate new one
  const eventId = body.event_id || generateEventId()

  // 8. Hash IP for privacy
  const ipHash = await hashIPAddress(clientIP)

  // 9. Log confidence level for debugging
  const confidenceLevel = getConfidenceLevel(finalGeo.confidence_radius_km)
  console.log(
    `[Track] Precision geo: locality=${finalGeo.locality_name}, ` +
    `confidence=${finalGeo.confidence_radius_km}km (${confidenceLevel}), ` +
    `source=${finalGeo.geo_source}`
  )

  // 10. Fire Meta CAPI event (async, non-blocking)
  if (campaign.meta_pixel_id) {
    const fbCookies = extractFacebookCookies(cookieHeader)

    fireQRCodeScanEvent({
      pixelId: campaign.meta_pixel_id,
      accessToken: campaign.meta_access_token || undefined,
      encryptedToken:
        campaign.encrypted_access_token && campaign.encryption_iv
          ? {
              ciphertext: campaign.encrypted_access_token,
              iv: campaign.encryption_iv,
              version: 1,
            }
          : undefined,
      eventId,
      sourceUrl: request.url,
      campaignId: campaign.id,
      campaignName: campaign.name,
      ipAddress: clientIP,
      userAgent,
      visitorId,
      postalCode: finalGeo.postcode,
      state: finalGeo.state,
      fbcCookie: fbCookies.fbc,
      fbpCookie: fbCookies.fbp,
    })
  }

  // 11. Record scan to database with precision geo data
  const supabase = createEdgeClient()

  const scanData = {
    campaign_id: campaign.id,
    visitor_id: visitorId,
    ip_address_hash: ipHash,

    // Precision location data from BigDataCloud
    locality_name: finalGeo.locality_name,
    city: finalGeo.city,
    suburb: finalGeo.locality_name || finalGeo.city, // Legacy field compatibility
    postcode: finalGeo.postcode,
    state: finalGeo.state,
    state_code: finalGeo.state_code,
    country: finalGeo.country || 'Australia',
    country_code: finalGeo.country_code || 'AU',

    // Coordinates
    latitude: finalGeo.latitude,
    longitude: finalGeo.longitude,

    // Precision metrics
    confidence_radius_km: finalGeo.confidence_radius_km,
    geo_source: finalGeo.geo_source,

    // Network info
    isp_name: finalGeo.isp_name,
    network_type: finalGeo.network_type,
    connection_type: finalGeo.connection_type,

    // Security flags
    is_vpn: finalGeo.is_vpn,
    is_proxy: finalGeo.is_proxy,
    is_tor: finalGeo.is_tor,

    // Device info
    user_agent: userAgent,
    device_type: device.device_type,
    browser: device.browser,
    os: device.os,

    // Context
    referrer: body.referrer || headers.get('referer'),
    cookie_expires_at: cookieExpiry.toISOString(),
    is_first_scan: isFirstScan || isFirstCampaignVisit,
    meta_event_id: eventId,
    scanned_at: new Date().toISOString(),
  }

  // Fire and forget - don't await
  supabase
    .from('scans')
    .insert(scanData)
    .then(({ error }) => {
      if (error) {
        console.error('[Track] Failed to record scan:', error)
      } else {
        const elapsed = Date.now() - startTime
        console.log(`[Track] Scan recorded: ${slug} (${elapsed}ms)`)
      }
    })
    .catch((err) => {
      console.error('[Track] Scan insert failed:', err)
    })

  // 12. Return success with geo info (for debugging in dev)
  return NextResponse.json({
    success: true,
    geo: {
      locality: finalGeo.locality_name,
      postcode: finalGeo.postcode,
      confidence_km: finalGeo.confidence_radius_km,
      confidence_level: confidenceLevel,
      source: finalGeo.geo_source,
    },
  })
}
