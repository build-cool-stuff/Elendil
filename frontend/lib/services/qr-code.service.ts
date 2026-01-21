import QRCode from 'qrcode'
import { nanoid } from 'nanoid'

export interface QRCodeGenerationResult {
  trackingCode: string
  trackingUrl: string
  qrCodeSvg: string
  qrCodeDataUrl: string
}

export interface QRCodeOptions {
  width?: number
  margin?: number
  color?: {
    dark: string
    light: string
  }
}

/**
 * Service for generating QR codes and tracking URLs
 */
export class QRCodeService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    // Use environment variable or fall back to localhost for development
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  /**
   * Generate a unique tracking code
   * @param customCode Optional custom code (must be alphanumeric with hyphens, 4-32 chars)
   */
  generateTrackingCode(customCode?: string): string {
    if (customCode) {
      // Validate: alphanumeric with hyphens, 4-32 chars
      if (!/^[a-zA-Z0-9-]{4,32}$/.test(customCode)) {
        throw new Error('Invalid custom code format. Must be 4-32 alphanumeric characters with optional hyphens.')
      }
      return customCode.toLowerCase()
    }
    // Generate an 8-character unique code
    return nanoid(8)
  }

  /**
   * Build the full tracking URL for a QR code
   * Uses the new /go/ route structure for Edge-optimized redirects
   * @param trackingCode The unique tracking code or slug
   * @param customDomain Optional custom domain for high-tier users
   */
  buildTrackingUrl(trackingCode: string, customDomain?: string): string {
    const baseUrl = customDomain ? `https://${customDomain}` : this.baseUrl
    return `${baseUrl}/go/${trackingCode}`
  }

  /**
   * Build legacy tracking URL (for backwards compatibility)
   * @deprecated Use buildTrackingUrl instead
   */
  buildLegacyTrackingUrl(trackingCode: string): string {
    return `${this.baseUrl}/q/${trackingCode}`
  }

  /**
   * Generate a QR code for a campaign
   */
  async generateQRCode(
    trackingCode: string,
    options: QRCodeOptions = {}
  ): Promise<QRCodeGenerationResult> {
    const trackingUrl = this.buildTrackingUrl(trackingCode)

    const qrOptions = {
      width: options.width || 300,
      margin: options.margin || 2,
      color: options.color || { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H' as const, // High error correction for reliability
    }

    // Generate SVG version
    const qrCodeSvg = await QRCode.toString(trackingUrl, {
      ...qrOptions,
      type: 'svg',
    })

    // Generate PNG data URL version
    const qrCodeDataUrl = await QRCode.toDataURL(trackingUrl, {
      ...qrOptions,
      type: 'image/png',
    })

    return {
      trackingCode,
      trackingUrl,
      qrCodeSvg,
      qrCodeDataUrl,
    }
  }

  /**
   * Generate a QR code as a buffer (for file downloads)
   */
  async generateQRCodeBuffer(
    trackingCode: string,
    options: QRCodeOptions = {}
  ): Promise<Buffer> {
    const trackingUrl = this.buildTrackingUrl(trackingCode)

    const qrOptions = {
      width: options.width || 600, // Higher resolution for downloads
      margin: options.margin || 2,
      color: options.color || { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H' as const,
    }

    return QRCode.toBuffer(trackingUrl, {
      ...qrOptions,
      type: 'png',
    })
  }

  /**
   * Validate a tracking code format
   */
  isValidTrackingCode(code: string): boolean {
    return /^[a-zA-Z0-9_-]{4,32}$/i.test(code)
  }
}

// Export a singleton instance for convenience
export const qrCodeService = new QRCodeService()
