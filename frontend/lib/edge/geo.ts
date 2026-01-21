/**
 * Geo extraction utilities for Vercel Edge
 * Extracts location data from Vercel's geo headers
 */

/**
 * Geo data extracted from Vercel Edge headers
 */
export interface GeoData {
  country: string | null
  countryRegion: string | null // State/Province code (e.g., 'NSW', 'VIC')
  city: string | null // City name (suburb proxy)
  postalCode: string | null // Postcode - primary for suburb lookup
  latitude: number | null
  longitude: number | null
}

/**
 * Extract geo data from Vercel Edge headers
 *
 * Vercel automatically provides these headers on Edge functions:
 * - x-vercel-ip-country: Country code (AU)
 * - x-vercel-ip-country-region: State/region code (NSW, VIC, QLD)
 * - x-vercel-ip-city: City name
 * - x-vercel-ip-postal-code: Postcode (primary for suburb lookup)
 * - x-vercel-ip-latitude: Latitude
 * - x-vercel-ip-longitude: Longitude
 *
 * @see https://vercel.com/docs/edge-network/headers#x-vercel-ip-country
 */
export function extractGeoFromHeaders(headers: Headers): GeoData {
  const latitude = headers.get('x-vercel-ip-latitude')
  const longitude = headers.get('x-vercel-ip-longitude')

  return {
    country: headers.get('x-vercel-ip-country'),
    countryRegion: headers.get('x-vercel-ip-country-region'),
    city: headers.get('x-vercel-ip-city'),
    postalCode: headers.get('x-vercel-ip-postal-code'),
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
  }
}

/**
 * Map Vercel region codes to Australian state names
 */
const AUSTRALIAN_STATES: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA: 'Western Australia',
  SA: 'South Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
}

/**
 * Get full state name from region code
 */
export function getStateName(regionCode: string | null): string | null {
  if (!regionCode) return null
  return AUSTRALIAN_STATES[regionCode.toUpperCase()] || regionCode
}

/**
 * Check if the request is from Australia
 */
export function isAustralian(geo: GeoData): boolean {
  return geo.country?.toUpperCase() === 'AU'
}

/**
 * Extract client IP from headers
 * Handles various proxy scenarios
 */
export function extractClientIP(headers: Headers): string {
  // Vercel provides the real IP in x-real-ip
  const realIP = headers.get('x-real-ip')
  if (realIP) return realIP

  // Fallback to x-forwarded-for (first IP in chain)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // Last resort
  return '0.0.0.0'
}

/**
 * Validate Australian postcode format
 */
export function isValidAustralianPostcode(postcode: string | null): boolean {
  if (!postcode) return false
  // Australian postcodes are 4 digits, 0200-9999
  return /^[0-9]{4}$/.test(postcode)
}
