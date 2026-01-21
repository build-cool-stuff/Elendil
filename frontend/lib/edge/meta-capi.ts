/**
 * Meta Conversions API (CAPI) client for Edge Runtime
 * Server-side event tracking for better attribution and privacy compliance
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { decrypt, hashSHA256, type EncryptedData } from './encryption'

/**
 * Meta CAPI event data
 */
export interface MetaCapiEvent {
  event_name: string
  event_time: number // Unix timestamp in seconds
  event_id: string // For deduplication with browser pixel
  event_source_url: string
  action_source: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other'
  user_data: MetaUserData
  custom_data?: Record<string, unknown>
  opt_out?: boolean
}

/**
 * Meta user data (hashed for privacy)
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */
export interface MetaUserData {
  client_ip_address?: string // Unhashed, Meta will hash it
  client_user_agent?: string // Unhashed
  em?: string[] // Hashed emails
  ph?: string[] // Hashed phone numbers
  fn?: string // Hashed first name
  ln?: string // Hashed last name
  ct?: string // Hashed city
  st?: string // Hashed state
  zp?: string // Hashed postal code
  country?: string // Hashed country code
  external_id?: string[] // Hashed external IDs (visitor_id)
  fbc?: string // Facebook click ID (from _fbc cookie)
  fbp?: string // Facebook browser ID (from _fbp cookie)
}

/**
 * Meta CAPI request payload
 */
interface MetaCapiPayload {
  data: MetaCapiEvent[]
  access_token: string
  test_event_code?: string // For testing in Events Manager
}

/**
 * Meta CAPI response
 */
interface MetaCapiResponse {
  events_received: number
  messages: string[]
  fbtrace_id: string
}

/**
 * Fire a Meta CAPI event (non-blocking)
 * Returns immediately, event is sent asynchronously
 */
export async function fireMetaCapiEvent(params: {
  pixelId: string
  accessToken?: string
  encryptedToken?: EncryptedData
  event: Omit<MetaCapiEvent, 'event_time'>
  testEventCode?: string
}): Promise<void> {
  // Decrypt access token if encrypted
  let accessToken = params.accessToken
  if (!accessToken && params.encryptedToken) {
    try {
      accessToken = await decrypt(params.encryptedToken)
    } catch (error) {
      console.error('[Meta CAPI] Failed to decrypt access token:', error)
      return
    }
  }

  if (!accessToken) {
    console.error('[Meta CAPI] No access token available')
    return
  }

  const endpoint = `https://graph.facebook.com/v18.0/${params.pixelId}/events`

  const payload: MetaCapiPayload = {
    data: [
      {
        ...params.event,
        event_time: Math.floor(Date.now() / 1000),
      },
    ],
    access_token: accessToken,
  }

  if (params.testEventCode) {
    payload.test_event_code = params.testEventCode
  }

  // Fire and forget
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.text()
        console.error('[Meta CAPI] Error response:', error)
      }
    })
    .catch((error) => {
      console.error('[Meta CAPI] Failed to send event:', error)
    })
}

/**
 * Build user data for Meta CAPI from scan context
 */
export async function buildMetaUserData(params: {
  ipAddress: string
  userAgent: string
  visitorId: string
  postalCode?: string | null
  state?: string | null
  country?: string | null
  fbcCookie?: string | null
  fbpCookie?: string | null
}): Promise<MetaUserData> {
  const userData: MetaUserData = {
    client_ip_address: params.ipAddress,
    client_user_agent: params.userAgent,
  }

  // Add hashed visitor ID as external_id
  if (params.visitorId) {
    const hashedVisitorId = await hashSHA256(params.visitorId.toLowerCase())
    userData.external_id = [hashedVisitorId]
  }

  // Add hashed location data if available
  if (params.postalCode) {
    userData.zp = await hashSHA256(params.postalCode.toLowerCase().replace(/\s/g, ''))
  }

  if (params.state) {
    userData.st = await hashSHA256(params.state.toLowerCase().replace(/\s/g, ''))
  }

  if (params.country) {
    userData.country = await hashSHA256(params.country.toLowerCase())
  }

  // Add Facebook cookies if present
  if (params.fbcCookie) {
    userData.fbc = params.fbcCookie
  }

  if (params.fbpCookie) {
    userData.fbp = params.fbpCookie
  }

  return userData
}

/**
 * Fire a QR Code Scan event to Meta CAPI
 */
export async function fireQRCodeScanEvent(params: {
  pixelId: string
  accessToken?: string
  encryptedToken?: EncryptedData
  eventId: string
  sourceUrl: string
  campaignId: string
  campaignName: string
  ipAddress: string
  userAgent: string
  visitorId: string
  postalCode?: string | null
  state?: string | null
  fbcCookie?: string | null
  fbpCookie?: string | null
  testEventCode?: string
}): Promise<void> {
  const userData = await buildMetaUserData({
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    visitorId: params.visitorId,
    postalCode: params.postalCode,
    state: params.state,
    country: 'au', // Default to Australia
    fbcCookie: params.fbcCookie,
    fbpCookie: params.fbpCookie,
  })

  await fireMetaCapiEvent({
    pixelId: params.pixelId,
    accessToken: params.accessToken,
    encryptedToken: params.encryptedToken,
    testEventCode: params.testEventCode,
    event: {
      event_name: 'QRCodeScan',
      event_id: params.eventId,
      event_source_url: params.sourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: {
        campaign_id: params.campaignId,
        campaign_name: params.campaignName,
        content_type: 'qr_code',
      },
    },
  })
}

/**
 * Fire a PageView event (standard Meta event)
 */
export async function firePageViewEvent(params: {
  pixelId: string
  accessToken?: string
  encryptedToken?: EncryptedData
  eventId: string
  sourceUrl: string
  ipAddress: string
  userAgent: string
  visitorId: string
  fbcCookie?: string | null
  fbpCookie?: string | null
}): Promise<void> {
  const userData = await buildMetaUserData({
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    visitorId: params.visitorId,
    fbcCookie: params.fbcCookie,
    fbpCookie: params.fbpCookie,
  })

  await fireMetaCapiEvent({
    pixelId: params.pixelId,
    accessToken: params.accessToken,
    encryptedToken: params.encryptedToken,
    event: {
      event_name: 'PageView',
      event_id: params.eventId,
      event_source_url: params.sourceUrl,
      action_source: 'website',
      user_data: userData,
    },
  })
}

/**
 * Extract Facebook cookies from cookie header
 */
export function extractFacebookCookies(cookieHeader: string): {
  fbc: string | null
  fbp: string | null
} {
  const cookies: Record<string, string> = {}

  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...valueParts] = cookie.split('=')
      if (name) {
        cookies[name.trim()] = valueParts.join('=').trim()
      }
    })
  }

  return {
    fbc: cookies['_fbc'] || null,
    fbp: cookies['_fbp'] || null,
  }
}
