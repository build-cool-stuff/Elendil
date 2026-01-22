/**
 * Edge Redirect Handler for QR Code Tracking
 *
 * This is the primary entry point for QR code scans.
 * Handles campaign lookup, geo extraction, scan recording, and Meta CAPI.
 *
 * Route: /go/[slug]
 * Runtime: Edge (Vercel Edge Functions)
 */

export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import {
  lookupCampaign,
  lookupSuburbByPostcode,
  recordScan,
} from '@/lib/edge/supabase-edge'
import {
  extractGeoFromHeaders,
  extractClientIP,
  getStateName,
  isValidAustralianPostcode,
} from '@/lib/edge/geo'
import { parseUserAgent } from '@/lib/edge/user-agent'
import {
  getOrCreateVisitorId,
  hasVisitedCampaign,
  buildTrackingCookies,
  calculateCookieExpiry,
  parseCookies,
} from '@/lib/edge/cookies'
import { hashIPAddress, generateEventId } from '@/lib/edge/encryption'
import {
  fireQRCodeScanEvent,
  extractFacebookCookies,
} from '@/lib/edge/meta-capi'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const startTime = Date.now()
  const { slug } = await params

  // 1. Lookup campaign by slug or tracking code
  const campaign = await lookupCampaign(slug)

  if (!campaign) {
    // Campaign not found or inactive - redirect to home
    console.log(`[Edge] Campaign not found: ${slug}`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. Extract request data
  const headers = request.headers
  const cookieHeader = headers.get('cookie') || ''
  const userAgent = headers.get('user-agent') || ''
  const referer = headers.get('referer')

  // 3. Extract geo data from Vercel headers
  const geo = extractGeoFromHeaders(headers)
  const clientIP = extractClientIP(headers)

  // 4. Lookup suburb by postcode for accurate data
  let suburb: string | null = geo.city
  let state: string | null = getStateName(geo.countryRegion)

  if (geo.postalCode && isValidAustralianPostcode(geo.postalCode)) {
    const suburbData = await lookupSuburbByPostcode(geo.postalCode)
    if (suburbData) {
      suburb = suburbData.name
      state = suburbData.state
    }
  }

  // 5. Parse device info
  const device = parseUserAgent(userAgent)

  // Skip bot tracking
  if (device.is_bot) {
    console.log(`[Edge] Bot detected, skipping tracking: ${userAgent}`)
    return NextResponse.redirect(campaign.destination_url, { status: 302 })
  }

  // 6. Cookie management
  const { visitorId, isNew: isFirstScan } = getOrCreateVisitorId(cookieHeader)
  const isFirstCampaignVisit = !hasVisitedCampaign(cookieHeader, campaign.id)
  const cookieExpiry = calculateCookieExpiry(campaign.cookie_duration_days)

  // 7. Generate event ID for Meta deduplication
  const eventId = generateEventId()

  // 8. Hash IP for privacy
  const ipHash = await hashIPAddress(clientIP)

  // 9. Determine redirect behavior
  // If bridge is enabled, the bridge page handles CAPI + precision geo tracking
  // If bridge is disabled, we fire CAPI here and record scan with basic Vercel geo

  // 10. Determine redirect behavior and scan recording strategy
  // If bridge is enabled, the bridge page will record the scan with precision geo
  // If bridge is disabled, we record the scan here with basic Vercel geo
  // If bridge is enabled, redirect to bridge page for client-side pixel firing
  // Otherwise, direct redirect to destination
  if (campaign.bridge_enabled) {
    // Redirect to bridge page with event context
    // Bridge page is at /go/[slug]/bridge (separate route to avoid route.ts conflict)
    const bridgeUrl = new URL(`/go/${slug}/bridge`, request.url)
    bridgeUrl.searchParams.set('eid', eventId)

    // Use 307 Temporary Redirect to prevent browser caching of the redirect
    // This ensures future QR scans always hit the edge handler first
    const response = NextResponse.redirect(bridgeUrl, { status: 307 })

    // Set tracking cookies
    const cookies = buildTrackingCookies({
      visitorId,
      campaignId: campaign.id,
      eventId,
      expiresAt: cookieExpiry,
    })

    cookies.forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie)
    })

    const elapsed = Date.now() - startTime
    console.log(`[Edge] Redirecting to bridge: ${slug} (${elapsed}ms)`)

    return response
  }

  // Direct redirect without bridge - fire CAPI and record scan here with Vercel geo
  // (Bridge page handles its own CAPI + scan recording with BigDataCloud precision)

  // Fire Meta CAPI event for direct redirects (async, non-blocking)
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
      postalCode: geo.postalCode,
      state,
      fbcCookie: fbCookies.fbc,
      fbpCookie: fbCookies.fbp,
    })
  }

  recordScan({
    campaign_id: campaign.id,
    visitor_id: visitorId,
    ip_address_hash: ipHash,
    latitude: geo.latitude,
    longitude: geo.longitude,
    suburb,
    postcode: geo.postalCode,
    state,
    country: geo.country || 'AU',
    user_agent: userAgent,
    device_type: device.device_type,
    browser: device.browser,
    os: device.os,
    referrer: referer,
    cookie_expires_at: cookieExpiry.toISOString(),
    is_first_scan: isFirstScan || isFirstCampaignVisit,
    meta_event_id: eventId,
  })

  const response = NextResponse.redirect(campaign.destination_url, { status: 302 })

  // Set tracking cookies
  const cookies = buildTrackingCookies({
    visitorId,
    campaignId: campaign.id,
    eventId,
    expiresAt: cookieExpiry,
  })

  cookies.forEach((cookie) => {
    response.headers.append('Set-Cookie', cookie)
  })

  const elapsed = Date.now() - startTime
  console.log(`[Edge] Direct redirect: ${slug} -> ${campaign.destination_url} (${elapsed}ms)`)

  return response
}
