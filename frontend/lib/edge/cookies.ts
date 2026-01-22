/**
 * Cookie utilities for Edge Runtime
 * Handles cookie parsing and setting for Edge Response
 */

/**
 * Cookie options for setting cookies
 */
export interface CookieOptions {
  expires?: Date
  maxAge?: number // seconds
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

/**
 * Parse cookies from Cookie header string
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}

  if (!cookieHeader) {
    return cookies
  }

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...valueParts] = cookie.split('=')
    if (name) {
      const trimmedName = name.trim()
      const value = valueParts.join('=').trim()
      // Decode URI-encoded values
      try {
        cookies[trimmedName] = decodeURIComponent(value)
      } catch {
        cookies[trimmedName] = value
      }
    }
  })

  return cookies
}

/**
 * Get a specific cookie value
 */
export function getCookie(cookieHeader: string, name: string): string | null {
  const cookies = parseCookies(cookieHeader)
  return cookies[name] || null
}

/**
 * Build a Set-Cookie header string
 */
export function buildSetCookieHeader(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const parts: string[] = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }

  if (options.domain) {
    parts.push(`Domain=${options.domain}`)
  }

  parts.push(`Path=${options.path || '/'}`)

  if (options.secure) {
    parts.push('Secure')
  }

  if (options.httpOnly) {
    parts.push('HttpOnly')
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }

  return parts.join('; ')
}

/**
 * Cookie names used by Elendil
 */
export const COOKIE_NAMES = {
  VISITOR_ID: '_fre_visitor',
  CAMPAIGN_PREFIX: '_fre_c_', // _fre_c_{campaign_id}
  EVENT_ID: '_fre_event',
} as const

/**
 * Generate visitor ID for tracking
 * Uses a combination of timestamp and random bytes
 */
export function generateVisitorId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomUUID().replace(/-/g, '').substring(0, 12)
  return `${timestamp}${random}`
}

/**
 * Check if visitor has been seen for this campaign
 */
export function hasVisitedCampaign(
  cookieHeader: string,
  campaignId: string
): boolean {
  const cookies = parseCookies(cookieHeader)
  return !!cookies[`${COOKIE_NAMES.CAMPAIGN_PREFIX}${campaignId}`]
}

/**
 * Get visitor ID from cookies, or generate new one
 */
export function getOrCreateVisitorId(cookieHeader: string): {
  visitorId: string
  isNew: boolean
} {
  const cookies = parseCookies(cookieHeader)
  const existingId = cookies[COOKIE_NAMES.VISITOR_ID]

  if (existingId && existingId.length >= 10) {
    return { visitorId: existingId, isNew: false }
  }

  return { visitorId: generateVisitorId(), isNew: true }
}

/**
 * Build all tracking cookies for a scan
 */
export function buildTrackingCookies(params: {
  visitorId: string
  campaignId: string
  eventId: string
  expiresAt: Date
  domain?: string
}): string[] {
  const baseOptions: CookieOptions = {
    expires: params.expiresAt,
    path: '/',
    sameSite: 'Lax',
    secure: true,
  }

  if (params.domain) {
    baseOptions.domain = params.domain
  }

  return [
    buildSetCookieHeader(COOKIE_NAMES.VISITOR_ID, params.visitorId, baseOptions),
    buildSetCookieHeader(
      `${COOKIE_NAMES.CAMPAIGN_PREFIX}${params.campaignId}`,
      '1',
      baseOptions
    ),
    buildSetCookieHeader(COOKIE_NAMES.EVENT_ID, params.eventId, {
      ...baseOptions,
      // Event ID expires sooner - just for deduplication window
      maxAge: 60 * 60 * 24 * 7, // 7 days
    }),
  ]
}

/**
 * Calculate cookie expiration date based on campaign duration
 */
export function calculateCookieExpiry(durationDays: number): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + durationDays)
  return expiry
}
