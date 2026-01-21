"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Script from "next/script"

interface CampaignData {
  id: string
  name: string
  destination_url: string
  cookie_duration_days: number
  user_id: string
  pixel_id?: string
}

// Cookie helper functions
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax; Secure`
}

// Generate a visitor ID based on available data
function generateVisitorId(): string {
  const nav = window.navigator
  const screen = window.screen
  const data = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    Math.random().toString(36).substring(2),
  ].join("|")

  // Simple hash function
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36) + Date.now().toString(36)
}

export default function BridgePage() {
  const params = useParams()
  const code = params.code as string

  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(2)
  const [pixelLoaded, setPixelLoaded] = useState(false)
  const [scanRecorded, setScanRecorded] = useState(false)

  // Record the scan
  const recordScan = useCallback(async (campaignData: CampaignData) => {
    try {
      // Get or create visitor ID
      const cookieName = `_fre_visitor`
      let visitorId = getCookie(cookieName)
      const isFirstScan = !visitorId

      if (!visitorId) {
        visitorId = generateVisitorId()
        setCookie(cookieName, visitorId, campaignData.cookie_duration_days)
      }

      // Also set campaign-specific cookie
      const campaignCookieName = `_fre_campaign_${campaignData.id}`
      setCookie(campaignCookieName, "1", campaignData.cookie_duration_days)

      // Try to get geolocation (optional, won't block if denied)
      let latitude: number | null = null
      let longitude: number | null = null

      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 2000, // 2 second timeout
              maximumAge: 300000, // Accept cached position up to 5 min old
            })
          })
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        } catch {
          // Geolocation denied or timed out - continue without it
          console.log("Geolocation not available")
        }
      }

      // Record scan via API
      await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignData.id,
          visitor_id: visitorId,
          is_first_scan: isFirstScan,
          latitude,
          longitude,
        }),
      })

      setScanRecorded(true)
    } catch (err) {
      console.error("Failed to record scan:", err)
      // Don't block redirect on scan recording failure
      setScanRecorded(true)
    }
  }, [])

  // Fetch campaign data
  useEffect(() => {
    async function fetchCampaign() {
      try {
        const response = await fetch(`/api/q/${code}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError("This QR code is no longer active.")
          } else {
            setError("Something went wrong. Please try again.")
          }
          return
        }
        const data = await response.json()
        setCampaign(data.campaign)

        // Record the scan
        recordScan(data.campaign)
      } catch {
        setError("Unable to load. Please try again.")
      }
    }

    if (code) {
      fetchCampaign()
    }
  }, [code, recordScan])

  // Countdown and redirect
  useEffect(() => {
    if (!campaign || !scanRecorded) return

    // Wait for pixel to load (or timeout after 2 seconds)
    const pixelTimeout = setTimeout(() => {
      if (!pixelLoaded) {
        setPixelLoaded(true) // Force continue even if pixel didn't load
      }
    }, 2000)

    if (!pixelLoaded && campaign.pixel_id) {
      return () => clearTimeout(pixelTimeout)
    }

    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          // Redirect
          window.location.href = campaign.destination_url
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearTimeout(pixelTimeout)
      clearInterval(countdownInterval)
    }
  }, [campaign, pixelLoaded, scanRecorded])

  // Fire Meta Pixel event when loaded
  const handlePixelLoad = () => {
    setPixelLoaded(true)
    // Fire custom QR scan event
    if (typeof window !== "undefined" && (window as unknown as { fbq?: Function }).fbq) {
      const fbq = (window as unknown as { fbq: Function }).fbq
      fbq("track", "QRCodeScan", {
        campaign_id: campaign?.id,
        campaign_name: campaign?.name,
      })
    }
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Oops!</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  // Loading state
  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Meta Pixel */}
      {campaign.pixel_id && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          onLoad={handlePixelLoad}
        >
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${campaign.pixel_id}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* If no pixel configured, mark as loaded immediately */}
      {!campaign.pixel_id && !pixelLoaded && (
        <Script id="no-pixel" strategy="afterInteractive" onLoad={() => setPixelLoaded(true)}>
          {`console.log('No Meta Pixel configured')`}
        </Script>
      )}

      {/* Bridge Page UI */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center p-8 max-w-md">
          {/* Animated logo/loading indicator */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* Message */}
          <h1 className="text-2xl font-bold text-white mb-2">
            Taking you there...
          </h1>
          <p className="text-slate-400 mb-6">
            You&apos;ll be redirected in {countdown} second{countdown !== 1 ? "s" : ""}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-linear"
              style={{ width: `${((2 - countdown) / 2) * 100}%` }}
            />
          </div>

          {/* Skip link */}
          <a
            href={campaign.destination_url}
            className="inline-block mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Click here if you&apos;re not redirected automatically
          </a>
        </div>
      </div>
    </>
  )
}
