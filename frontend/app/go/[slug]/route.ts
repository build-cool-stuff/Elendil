/**
 * Edge Redirect Handler for QR Code Tracking
 *
 * This is the primary entry point for QR code scans.
 * Handles campaign lookup, billing gate, geo extraction, scan recording, and Meta CAPI.
 *
 * Premium features (bridge, CAPI, suburb lookup) require billing_active or grace period.
 * Degraded mode: basic scan record + 302 redirect only.
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
    console.log(`[Edge] Campaign not found: ${slug}`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. Billing gate — determine if premium features are available
  const inGrace = !!(campaign.grace_period_end && new Date(campaign.grace_period_end) > new Date())
  const isPremium = campaign.billing_active || inGrace

  // 3. Extract request data
  const headers = request.headers
  const cookieHeader = headers.get('cookie') || ''
  const userAgent = headers.get('user-agent') || ''
  const referer = headers.get('referer')

  // 4. Extract geo data from Vercel headers
  const geo = extractGeoFromHeaders(headers)
  const clientIP = extractClientIP(headers)

  // 5. Suburb lookup — only for premium users
  let suburb: string | null = geo.city
  let state: string | null = getStateName(geo.countryRegion)

  if (isPremium && geo.postalCode && isValidAustralianPostcode(geo.postalCode)) {
    const suburbData = await lookupSuburbByPostcode(geo.postalCode)
    if (suburbData) {
      suburb = suburbData.name
      state = suburbData.state
    }
  }

  // 6. Parse device info
  const device = parseUserAgent(userAgent)

  // Skip bot tracking
  if (device.is_bot) {
    console.log(`[Edge] Bot detected, skipping tracking: ${userAgent}`)
    return NextResponse.redirect(campaign.destination_url, { status: 302 })
  }

  // 7. Cookie management
  const { visitorId, isNew: isFirstScan } = getOrCreateVisitorId(cookieHeader)
  const isFirstCampaignVisit = !hasVisitedCampaign(cookieHeader, campaign.id)
  const cookieExpiry = calculateCookieExpiry(campaign.cookie_duration_days)

  // 8. Generate event ID for Meta deduplication
  const eventId = generateEventId()

  // 9. Hash IP for privacy
  const ipHash = await hashIPAddress(clientIP)

  // 10. Determine redirect behavior based on billing + bridge
  // Premium + bridge: redirect to bridge page for CAPI + precision geo
  // Premium + no bridge: fire CAPI here, record scan with Vercel geo
  // Degraded: basic scan record + direct redirect (no CAPI, no bridge)

  if (isPremium && campaign.bridge_enabled) {
    // Redirect to bridge page with event context
    const isBridgeFirstScan = isFirstScan || isFirstCampaignVisit
    const bridgeUrl = new URL(`/go/${slug}/bridge`, request.url)
    bridgeUrl.searchParams.set('eid', eventId)
    if (isBridgeFirstScan) {
      bridgeUrl.searchParams.set('first', '1')
    }

    const response = NextResponse.redirect(bridgeUrl, { status: 307 })

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

  // Direct redirect path (premium without bridge, or degraded)

  // Fire Meta CAPI — only for premium users
  if (isPremium && campaign.meta_pixel_id) {
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

  // Record basic scan (always — even when degraded)
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

  // Emit billing meter event — only for billable first scans with active billing
  // Don't emit during grace period (don't charge on a failed payment)
  const isBillableScan = isFirstScan || isFirstCampaignVisit
  if (isBillableScan && campaign.billing_active && !inGrace && campaign.stripe_customer_id) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    void fetch(`${appUrl}/api/billing/emit-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({
        user_id: campaign.user_id,
        stripe_customer_id: campaign.stripe_customer_id,
        event_id: eventId,
      }),
    }).catch((err) => console.error('[Edge] Failed to emit usage:', err))
  }

  const response = NextResponse.redirect(campaign.destination_url, { status: 302 })

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
  const mode = isPremium ? 'premium' : 'degraded'
  console.log(`[Edge] Direct redirect (${mode}): ${slug} -> ${campaign.destination_url} (${elapsed}ms)`)

  return response
}
