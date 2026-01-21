/**
 * Lightweight User-Agent parser for Edge Runtime
 * No external dependencies - pure regex-based detection
 */

/**
 * Parsed device information
 */
export interface DeviceInfo {
  device_type: 'mobile' | 'tablet' | 'desktop'
  browser: string
  browser_version: string
  os: string
  os_version: string
  is_bot: boolean
}

/**
 * Parse User-Agent string into device information
 * Optimized for Edge Runtime (no heavy dependencies)
 */
export function parseUserAgent(ua: string): DeviceInfo {
  if (!ua) {
    return {
      device_type: 'desktop',
      browser: 'Unknown',
      browser_version: '',
      os: 'Unknown',
      os_version: '',
      is_bot: false,
    }
  }

  const lowerUA = ua.toLowerCase()

  // Bot detection
  const is_bot = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|mediapartners/i.test(ua)

  // Device type detection
  const device_type = detectDeviceType(lowerUA)

  // Browser detection
  const { browser, browser_version } = detectBrowser(ua)

  // OS detection
  const { os, os_version } = detectOS(ua)

  return {
    device_type,
    browser,
    browser_version,
    os,
    os_version,
    is_bot,
  }
}

/**
 * Detect device type from User-Agent
 */
function detectDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
  // Tablet detection (before mobile, as some tablets have 'mobile' in UA)
  if (
    /ipad|tablet|playbook|silk|kindle|nexus\s*(?:7|9|10)/i.test(ua) ||
    (/android/i.test(ua) && !/mobile/i.test(ua))
  ) {
    return 'tablet'
  }

  // Mobile detection
  if (
    /mobile|iphone|ipod|android.*mobile|windows\s*phone|blackberry|bb\d+|meego|webos|palm|symbian|opera\s*mini|opera\s*mobi|iemobile/i.test(
      ua
    )
  ) {
    return 'mobile'
  }

  return 'desktop'
}

/**
 * Detect browser and version
 */
function detectBrowser(ua: string): { browser: string; browser_version: string } {
  // Order matters - more specific patterns first

  // Edge (Chromium-based)
  let match = ua.match(/Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)?)/i)
  if (match) {
    return { browser: 'Edge', browser_version: match[1] }
  }

  // Opera
  match = ua.match(/(?:OPR|Opera)\/(\d+(?:\.\d+)?)/i)
  if (match) {
    return { browser: 'Opera', browser_version: match[1] }
  }

  // Samsung Browser
  match = ua.match(/SamsungBrowser\/(\d+(?:\.\d+)?)/i)
  if (match) {
    return { browser: 'Samsung Browser', browser_version: match[1] }
  }

  // UC Browser
  match = ua.match(/UCBrowser\/(\d+(?:\.\d+)?)/i)
  if (match) {
    return { browser: 'UC Browser', browser_version: match[1] }
  }

  // Chrome (must be after Edge, Opera, Samsung)
  match = ua.match(/(?:Chrome|CriOS)\/(\d+(?:\.\d+)?)/i)
  if (match && !/Edg|OPR|Opera|SamsungBrowser/i.test(ua)) {
    return { browser: 'Chrome', browser_version: match[1] }
  }

  // Firefox
  match = ua.match(/(?:Firefox|FxiOS)\/(\d+(?:\.\d+)?)/i)
  if (match) {
    return { browser: 'Firefox', browser_version: match[1] }
  }

  // Safari (must be after Chrome)
  match = ua.match(/Version\/(\d+(?:\.\d+)?).*Safari/i)
  if (match && !/Chrome|CriOS|Edg|OPR|Opera/i.test(ua)) {
    return { browser: 'Safari', browser_version: match[1] }
  }

  // IE
  match = ua.match(/(?:MSIE |rv:)(\d+(?:\.\d+)?)/i)
  if (match) {
    return { browser: 'Internet Explorer', browser_version: match[1] }
  }

  // Facebook In-App Browser
  if (/FBAN|FBAV/i.test(ua)) {
    match = ua.match(/FBAV\/(\d+(?:\.\d+)?)/i)
    return { browser: 'Facebook', browser_version: match?.[1] || '' }
  }

  // Instagram In-App Browser
  if (/Instagram/i.test(ua)) {
    match = ua.match(/Instagram\s*(\d+(?:\.\d+)?)/i)
    return { browser: 'Instagram', browser_version: match?.[1] || '' }
  }

  return { browser: 'Unknown', browser_version: '' }
}

/**
 * Detect operating system and version
 */
function detectOS(ua: string): { os: string; os_version: string } {
  let match: RegExpMatchArray | null

  // iOS
  match = ua.match(/(?:iPhone|iPad|iPod).*OS\s*(\d+[_\d]*)/i)
  if (match) {
    return { os: 'iOS', os_version: match[1].replace(/_/g, '.') }
  }

  // Android
  match = ua.match(/Android\s*(\d+(?:\.\d+)?)/i)
  if (match) {
    return { os: 'Android', os_version: match[1] }
  }

  // Windows
  match = ua.match(/Windows\s*(?:NT\s*)?(\d+(?:\.\d+)?)/i)
  if (match) {
    const version = match[1]
    // Map NT versions to marketing names
    const windowsVersions: Record<string, string> = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.1': 'XP',
    }
    return { os: 'Windows', os_version: windowsVersions[version] || version }
  }

  // macOS
  match = ua.match(/Mac\s*OS\s*X?\s*(\d+[_\.\d]*)/i)
  if (match) {
    return { os: 'macOS', os_version: match[1].replace(/_/g, '.') }
  }

  // Linux
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) {
    return { os: 'Linux', os_version: '' }
  }

  // Chrome OS
  if (/CrOS/i.test(ua)) {
    return { os: 'Chrome OS', os_version: '' }
  }

  return { os: 'Unknown', os_version: '' }
}

/**
 * Get a simplified browser/OS string for display
 */
export function getSimpleDeviceString(info: DeviceInfo): string {
  const browser = info.browser_version
    ? `${info.browser} ${info.browser_version.split('.')[0]}`
    : info.browser

  const os = info.os_version
    ? `${info.os} ${info.os_version.split('.')[0]}`
    : info.os

  return `${browser} on ${os}`
}
