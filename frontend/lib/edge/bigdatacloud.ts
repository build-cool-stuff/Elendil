/**
 * BigDataCloud IP Geolocation API Client
 *
 * Uses Network Topology Geolocation for suburb-level precision.
 * Standard IP lookups only give postcode-level accuracy (one postcode can cover 5+ suburbs).
 * BigDataCloud's "Confidence Area" polygons analyze network hops to identify
 * the specific ISP Exchange or Cabinet, which typically serves a single suburb.
 *
 * @see https://www.bigdatacloud.com/docs/api/ip-geolocation-full
 */

/**
 * BigDataCloud API response for IP geolocation
 */
export interface BigDataCloudGeoResponse {
  // IP Information
  ip: string
  isReachableGlobally: boolean

  // Location - Primary
  country: {
    isoAlpha2: string
    isoAlpha3: string
    name: string
  }
  location: {
    continent: string
    continentCode: string
    isoPrincipalSubdivision: string // State/Province
    isoPrincipalSubdivisionCode: string
    city: string
    localityName: string // Suburb - THIS IS THE KEY FIELD
    postcode: string
    latitude: number
    longitude: number
    timeZone: {
      ianaTimeId: string
    }
  }

  // Confidence & Precision
  confidenceArea: {
    latitude: number
    longitude: number
    radius: number // in kilometers - lower = more precise
  }

  // Network Information
  network: {
    organisation: string // ISP name
    isoCCode: string
    carrier?: {
      name: string
      mcc: string
      mnc: string
    }
    networkType: 'business' | 'isp' | 'hosting' | 'education' | 'government' | 'military'
    connectionType: 'dialup' | 'isdn' | 'cable' | 'dsl' | 'fttx' | 'wireless' | 'satellite' | 'mobile'
  }

  // Security Flags
  hazardReport?: {
    isKnownAsTorServer: boolean
    isKnownAsVpn: boolean
    isKnownAsProxy: boolean
    isSpamhausDrop: boolean
    isSpamhausEdrop: boolean
    isSpamhausAsnDrop: boolean
    isBlocked: boolean
    isKnownAsMailServer: boolean
  }
}

/**
 * Simplified geo data extracted from BigDataCloud response
 */
export interface PrecisionGeoData {
  // Location
  locality_name: string | null // Suburb name (primary)
  city: string | null
  postcode: string | null
  state: string | null
  state_code: string | null
  country: string | null
  country_code: string | null

  // Coordinates
  latitude: number | null
  longitude: number | null

  // Precision metrics
  confidence_radius_km: number | null // Lower = more accurate
  geo_source: 'bigdatacloud' | 'vercel' | 'fallback'

  // Network info
  isp_name: string | null
  network_type: string | null
  connection_type: string | null

  // Security flags
  is_vpn: boolean
  is_proxy: boolean
  is_tor: boolean
}

/**
 * Confidence level thresholds (in km)
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 1, // < 1km = very precise (single suburb)
  MEDIUM: 5, // 1-5km = good (small cluster of suburbs)
  LOW: 20, // 5-20km = acceptable (district level)
  UNRELIABLE: 50, // > 20km = too broad, fallback to postcode
} as const

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unreliable'

/**
 * Get confidence level from radius
 */
export function getConfidenceLevel(radiusKm: number | null): ConfidenceLevel {
  if (radiusKm === null) return 'unreliable'
  if (radiusKm < CONFIDENCE_THRESHOLDS.HIGH) return 'high'
  if (radiusKm < CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium'
  if (radiusKm < CONFIDENCE_THRESHOLDS.LOW) return 'low'
  return 'unreliable'
}

/**
 * Fetch precision geolocation data from BigDataCloud
 *
 * @param ipAddress - The IP address to geolocate
 * @returns Simplified geo data with confidence metrics
 */
export async function fetchPrecisionGeo(
  ipAddress: string
): Promise<PrecisionGeoData> {
  const apiKey = process.env.BIGDATACLOUD_API_KEY

  if (!apiKey) {
    console.warn('[BigDataCloud] API key not configured, using fallback')
    return createFallbackGeoData()
  }

  // Skip private/local IPs
  if (isPrivateIP(ipAddress)) {
    console.log('[BigDataCloud] Private IP detected, using fallback')
    return createFallbackGeoData()
  }

  try {
    const endpoint = `https://api.bigdatacloud.net/data/ip-geolocation-full?ip=${encodeURIComponent(
      ipAddress
    )}&key=${apiKey}`

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`[BigDataCloud] API error: ${response.status}`)
      return createFallbackGeoData()
    }

    const data: BigDataCloudGeoResponse = await response.json()
    return extractGeoData(data)
  } catch (error) {
    console.error('[BigDataCloud] Failed to fetch geo data:', error)
    return createFallbackGeoData()
  }
}

/**
 * Extract simplified geo data from BigDataCloud response
 */
function extractGeoData(response: BigDataCloudGeoResponse): PrecisionGeoData {
  const location = response.location
  const network = response.network
  const confidence = response.confidenceArea
  const hazard = response.hazardReport

  return {
    // Location
    locality_name: location?.localityName || null,
    city: location?.city || null,
    postcode: location?.postcode || null,
    state: location?.isoPrincipalSubdivision || null,
    state_code: location?.isoPrincipalSubdivisionCode || null,
    country: response.country?.name || null,
    country_code: response.country?.isoAlpha2 || null,

    // Coordinates
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,

    // Precision
    confidence_radius_km: confidence?.radius || null,
    geo_source: 'bigdatacloud',

    // Network
    isp_name: network?.organisation || null,
    network_type: network?.networkType || null,
    connection_type: network?.connectionType || null,

    // Security
    is_vpn: hazard?.isKnownAsVpn || false,
    is_proxy: hazard?.isKnownAsProxy || false,
    is_tor: hazard?.isKnownAsTorServer || false,
  }
}

/**
 * Create fallback geo data when API is unavailable
 */
function createFallbackGeoData(): PrecisionGeoData {
  return {
    locality_name: null,
    city: null,
    postcode: null,
    state: null,
    state_code: null,
    country: null,
    country_code: null,
    latitude: null,
    longitude: null,
    confidence_radius_km: null,
    geo_source: 'fallback',
    isp_name: null,
    network_type: null,
    connection_type: null,
    is_vpn: false,
    is_proxy: false,
    is_tor: false,
  }
}

/**
 * Check if IP is private/local
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateRanges = [
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^127\./, // Loopback
    /^0\./, // Reserved
    /^169\.254\./, // Link-local
  ]

  return privateRanges.some((range) => range.test(ip)) || ip === '::1'
}

/**
 * Merge BigDataCloud data with Vercel headers as fallback
 */
export function mergeWithVercelFallback(
  bigDataCloud: PrecisionGeoData,
  vercelData: {
    city?: string | null
    postalCode?: string | null
    countryRegion?: string | null
    country?: string | null
    latitude?: number | null
    longitude?: number | null
  }
): PrecisionGeoData {
  // If BigDataCloud has high confidence, use it
  const confidence = getConfidenceLevel(bigDataCloud.confidence_radius_km)

  if (confidence === 'high' || confidence === 'medium') {
    return bigDataCloud
  }

  // For low confidence or fallback, merge with Vercel data
  return {
    ...bigDataCloud,
    locality_name: bigDataCloud.locality_name || vercelData.city || null,
    city: bigDataCloud.city || vercelData.city || null,
    postcode: bigDataCloud.postcode || vercelData.postalCode || null,
    state_code: bigDataCloud.state_code || vercelData.countryRegion || null,
    country_code: bigDataCloud.country_code || vercelData.country || null,
    latitude: bigDataCloud.latitude || vercelData.latitude || null,
    longitude: bigDataCloud.longitude || vercelData.longitude || null,
    geo_source: bigDataCloud.geo_source === 'bigdatacloud' ? 'bigdatacloud' : 'vercel',
  }
}
