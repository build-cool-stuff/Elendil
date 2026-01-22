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
 *
 * This service is stateless - baseUrl must be provided to methods that need it.
 * This allows each campaign to have its own tracking base URL.
 */
export class QRCodeService {
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
   * Uses the /go/ route structure for Edge-optimized redirects
   * @param trackingCode The unique tracking code or slug
   * @param baseUrl The base URL for tracking (e.g., https://example.com)
   */
  buildTrackingUrl(trackingCode: string, baseUrl: string): string {
    // Ensure baseUrl doesn't have trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    return `${cleanBaseUrl}/go/${trackingCode}`
  }

  /**
   * Generate a QR code for a campaign
   * @param trackingCode The unique tracking code
   * @param baseUrl The base URL for tracking (e.g., https://example.com)
   * @param options Optional QR code customization options
   */
  async generateQRCode(
    trackingCode: string,
    baseUrl: string,
    options: QRCodeOptions = {}
  ): Promise<QRCodeGenerationResult> {
    const trackingUrl = this.buildTrackingUrl(trackingCode, baseUrl)

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
   * @param trackingCode The unique tracking code
   * @param baseUrl The base URL for tracking (e.g., https://example.com)
   * @param options Optional QR code customization options
   */
  async generateQRCodeBuffer(
    trackingCode: string,
    baseUrl: string,
    options: QRCodeOptions = {}
  ): Promise<Buffer> {
    const trackingUrl = this.buildTrackingUrl(trackingCode, baseUrl)

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
// Note: This instance is stateless - baseUrl must be provided to methods
export const qrCodeService = new QRCodeService()
