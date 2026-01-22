"use client"

/**
 * Notice-Only Bridge Page for QR Code Redirects
 *
 * Instead of a forced "Accept" button (which adds friction), this page uses a
 * "Presented Notice" approach - a small banner satisfies transparency requirements
 * while the high-precision BigDataCloud API and Meta Pixel fire in the background.
 *
 * Route: /go/[slug]/bridge
 *
 * Flow:
 * 1. Page loads immediately
 * 2. Background: Fetch precision geo from BigDataCloud
 * 3. Background: Fire Meta Pixel + CAPI event
 * 4. Background: Record scan with granular location data
 * 5. Auto-redirect when tracking completes (no user action needed)
 */

import { useEffect, useState, useCallback, useRef, Suspense } from "react"
import { useSearchParams, useParams } from "next/navigation"

interface CampaignData {
  id: string
  name: string
  destination_url: string
  pixel_id: string | null
  bridge_duration_ms: number
}

interface TrackingStatus {
  geoComplete: boolean
  pixelComplete: boolean
  scanRecorded: boolean
}

function BridgeContent() {
  const searchParams = useSearchParams()
  const params = useParams()
  const eventId = searchParams.get("eid")
  const slug = params.slug as string
  const hasTracked = useRef(false)

  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
    geoComplete: false,
    pixelComplete: false,
    scanRecorded: false,
  })

  // Fetch campaign data
  useEffect(() => {
    if (!slug) {
      setError("Invalid link")
      return
    }

    fetch(`/api/go/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Campaign not found")
        return res.json()
      })
      .then((data) => setCampaign(data))
      .catch(() => setError("This link is no longer active"))
  }, [slug])

  // Fire Meta Pixel (client-side)
  const firePixel = useCallback(() => {
    if (!campaign?.pixel_id) {
      setTrackingStatus((prev) => ({ ...prev, pixelComplete: true }))
      return
    }

    // Load Meta Pixel script if not already loaded
    if (typeof window !== "undefined" && !(window as any).fbq) {
      const script = document.createElement("script")
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `
      document.head.appendChild(script)
    }

    // Wait for fbq to be available
    const checkFbq = setInterval(() => {
      if ((window as any).fbq) {
        clearInterval(checkFbq)
        const fbq = (window as any).fbq

        // Initialize pixel
        fbq("init", campaign.pixel_id)

        // Fire PageView
        fbq("track", "PageView")

        // Fire QRCodeScan custom event with deduplication event_id
        fbq(
          "track",
          "QRCodeScan",
          {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
          },
          {
            eventID: eventId, // Matches server-side event_id for deduplication
          }
        )

        setTrackingStatus((prev) => ({ ...prev, pixelComplete: true }))
      }
    }, 50)

    // Timeout after 2 seconds
    setTimeout(() => {
      clearInterval(checkFbq)
      setTrackingStatus((prev) => ({ ...prev, pixelComplete: true }))
    }, 2000)
  }, [campaign, eventId])

  // Record scan with precision geo (calls backend which uses BigDataCloud)
  const recordPrecisionScan = useCallback(async () => {
    if (!campaign || !slug || hasTracked.current) return
    hasTracked.current = true

    try {
      // Call the precision tracking endpoint
      await fetch(`/api/go/${slug}/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          referrer: document.referrer || null,
          screen_width: window.screen.width,
          screen_height: window.screen.height,
        }),
      })

      setTrackingStatus((prev) => ({
        ...prev,
        geoComplete: true,
        scanRecorded: true,
      }))
    } catch (error) {
      console.error("Failed to record scan:", error)
      // Still mark as complete to allow redirect
      setTrackingStatus((prev) => ({
        ...prev,
        geoComplete: true,
        scanRecorded: true,
      }))
    }
  }, [campaign, slug, eventId])

  // Start tracking when campaign loads
  useEffect(() => {
    if (campaign) {
      firePixel()
      recordPrecisionScan()
    }
  }, [campaign, firePixel, recordPrecisionScan])

  // Auto-redirect when tracking completes
  useEffect(() => {
    if (!campaign) return

    const allComplete =
      trackingStatus.geoComplete && trackingStatus.pixelComplete

    if (allComplete) {
      // Small delay to ensure all async operations complete
      const redirectTimer = setTimeout(() => {
        window.location.href = campaign.destination_url
      }, 100)

      return () => clearTimeout(redirectTimer)
    }

    // Fallback: redirect after max wait time regardless of tracking status
    const fallbackTimer = setTimeout(() => {
      window.location.href = campaign.destination_url
    }, campaign.bridge_duration_ms || 800)

    return () => clearTimeout(fallbackTimer)
  }, [campaign, trackingStatus])

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Link Unavailable
          </h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    )
  }

  // Loading state with notice banner
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Notice Banner - Transparency requirement satisfied */}
      <div className="fixed top-0 left-0 right-0 bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <p className="text-white/60 text-xs">
            We use analytics to improve our services.{" "}
            <span className="text-white/40">
              Redirecting automatically...
            </span>
          </p>
          {campaign && (
            <button
              onClick={() => (window.location.href = campaign.destination_url)}
              className="text-xs text-white/50 hover:text-white/80 underline transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="text-center p-8 max-w-sm w-full">
        {/* Loading spinner */}
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-t-white/60 animate-spin" />
          {/* Inner checkmark that appears when ready */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
              trackingStatus.geoComplete && trackingStatus.pixelComplete
                ? "opacity-100"
                : "opacity-0"
            }`}
          >
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Status text */}
        <h1 className="text-lg font-medium text-white mb-2">
          {trackingStatus.geoComplete && trackingStatus.pixelComplete
            ? "Ready!"
            : "Preparing your destination..."}
        </h1>

        {campaign && (
          <p className="text-white/40 text-sm mb-6 truncate">
            {new URL(campaign.destination_url).hostname}
          </p>
        )}

        {/* Manual skip link */}
        {campaign && (
          <button
            onClick={() => (window.location.href = campaign.destination_url)}
            className="text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            Click here if not redirected
          </button>
        )}
      </div>

      {/* Subtle branding */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/15 text-xs">
        Powered by Elendil
      </div>
    </div>
  )
}

export default function BridgePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60">Loading...</p>
          </div>
        </div>
      }
    >
      <BridgeContent />
    </Suspense>
  )
}
