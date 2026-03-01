"use client"

import { useState, useEffect } from "react"
import { Card, Button } from "shared-components"
import { Facebook, ExternalLink } from "lucide-react"

export function SettingsPanel() {
  const [glassOpacity, setGlassOpacity] = useState(25)
  const [metaPixelId, setMetaPixelId] = useState("")
  const [originalPixelId, setOriginalPixelId] = useState("")
  const [metaCapiToken, setMetaCapiToken] = useState("")
  const [isCapiTokenSet, setIsCapiTokenSet] = useState(false)
  const [isLoadingPixel, setIsLoadingPixel] = useState(true)
  const [isSavingPixel, setIsSavingPixel] = useState(false)
  const [pixelSaveStatus, setPixelSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isSavingToken, setIsSavingToken] = useState(false)
  const [tokenSaveStatus, setTokenSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Fetch user settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings")
        if (res.ok) {
          const data = await res.json()
          setMetaPixelId(data.meta_pixel_id || "")
          setOriginalPixelId(data.meta_pixel_id || "")
          setIsCapiTokenSet(!!data.meta_access_token_set)
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      } finally {
        setIsLoadingPixel(false)
      }
    }
    fetchSettings()
  }, [])

  // Save Meta Pixel ID
  const saveMetaPixelId = async () => {
    setIsSavingPixel(true)
    setPixelSaveStatus(null)

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta_pixel_id: metaPixelId.trim() || null }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPixelSaveStatus({ type: "error", message: data.error || "Failed to save" })
        return
      }

      setOriginalPixelId(data.meta_pixel_id || "")
      setPixelSaveStatus({ type: "success", message: data.message })

      // Clear success message after 3 seconds
      setTimeout(() => setPixelSaveStatus(null), 3000)
    } catch (error) {
      setPixelSaveStatus({ type: "error", message: "Failed to save settings" })
    } finally {
      setIsSavingPixel(false)
    }
  }

  const saveMetaCapiToken = async () => {
    if (!metaCapiToken.trim()) return

    setIsSavingToken(true)
    setTokenSaveStatus(null)

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta_access_token: metaCapiToken.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setTokenSaveStatus({ type: "error", message: data.error || "Failed to save token" })
        return
      }

      setIsCapiTokenSet(!!data.meta_access_token_set)
      setMetaCapiToken("")
      setTokenSaveStatus({ type: "success", message: "CAPI token saved successfully" })
      setTimeout(() => setTokenSaveStatus(null), 3000)
    } catch {
      setTokenSaveStatus({ type: "error", message: "Failed to save token" })
    } finally {
      setIsSavingToken(false)
    }
  }

  const clearMetaCapiToken = async () => {
    setIsSavingToken(true)
    setTokenSaveStatus(null)

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta_access_token: null }),
      })

      const data = await res.json()

      if (!res.ok) {
        setTokenSaveStatus({ type: "error", message: data.error || "Failed to clear token" })
        return
      }

      setIsCapiTokenSet(!!data.meta_access_token_set)
      setMetaCapiToken("")
      setTokenSaveStatus({ type: "success", message: "CAPI token removed" })
      setTimeout(() => setTokenSaveStatus(null), 3000)
    } catch {
      setTokenSaveStatus({ type: "error", message: "Failed to clear token" })
    } finally {
      setIsSavingToken(false)
    }
  }

  // Update CSS custom properties in real-time
  const updateGlassOpacity = (value: number) => {
    setGlassOpacity(value)
    document.documentElement.style.setProperty('--glass-opacity', (value / 100).toString())
  }

  const hasPixelIdChanged = metaPixelId.trim() !== originalPixelId

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-white/60">Customize your dashboard appearance and preferences.</p>
      </Card>

      {/* Meta Pixel Integration - First Section */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Facebook className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Meta Pixel</h3>
            <p className="text-white/50 text-sm">Track QR code scans with your Meta Pixel</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-white/80 font-medium text-sm block mb-2">
              Pixel ID
            </label>
            {isLoadingPixel ? (
              <div className="h-12 bg-white/10 rounded-xl animate-pulse" />
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter your Meta Pixel ID (e.g., 1234567890123456)"
                  className="flex-1 h-12 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                />
                <Button
                  variant="glass"
                  className={`h-12 px-6 ${hasPixelIdChanged ? "bg-blue-500/30 hover:bg-blue-500/40" : ""}`}
                  onClick={saveMetaPixelId}
                  disabled={isSavingPixel || !hasPixelIdChanged}
                >
                  {isSavingPixel ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
            {pixelSaveStatus && (
              <p className={`text-sm mt-2 ${pixelSaveStatus.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {pixelSaveStatus.message}
              </p>
            )}
            <p className="text-white/40 text-sm mt-2">
              Find your Pixel ID in Meta Events Manager under Data Sources. When set, the pixel will fire automatically on every QR code scan.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a
                href="https://www.facebook.com/business/help/952192354843755"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                How to find your Pixel ID
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://www.youtube.com/watch?v=O6_dtwV88OM"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Video tutorial
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {originalPixelId && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-300 text-sm font-medium">Pixel Active</p>
                <p className="text-green-300/60 text-xs">Events will fire on all QR code scans</p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <label className="text-white/80 font-medium text-sm block mb-2">
              Conversions API Access Token (optional)
            </label>
            {isLoadingPixel ? (
              <div className="h-12 bg-white/10 rounded-xl animate-pulse" />
            ) : (
              <div className="flex gap-3">
                <input
                  type="password"
                  value={metaCapiToken}
                  onChange={(e) => setMetaCapiToken(e.target.value)}
                  placeholder="Paste your Meta CAPI access token"
                  className="flex-1 h-12 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                />
                <Button
                  variant="glass"
                  className="h-12 px-6"
                  onClick={saveMetaCapiToken}
                  disabled={isSavingToken || !metaCapiToken.trim()}
                >
                  {isSavingToken ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="glass"
                  className="h-12 px-6"
                  onClick={clearMetaCapiToken}
                  disabled={isSavingToken || !isCapiTokenSet}
                >
                  Clear
                </Button>
              </div>
            )}
            {tokenSaveStatus && (
              <p className={`text-sm mt-2 ${tokenSaveStatus.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {tokenSaveStatus.message}
              </p>
            )}
            <p className="text-white/40 text-sm mt-2">
              Adding a CAPI token enables server-side events for more reliable attribution. Keep this token secret.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a
                href="https://developers.facebook.com/docs/marketing-api/conversions-api/get-started#access-token"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                How to generate a CAPI token
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://www.youtube.com/watch?v=NIHt513ta9Y"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Video tutorial
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {isCapiTokenSet && (
              <p className="text-green-300/60 text-xs mt-1">CAPI token is set and ready.</p>
            )}
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Appearance</h3>

        {/* Glass Opacity Slider */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-white/80 font-medium">Glass Opacity</label>
            <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-lg">{glassOpacity}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            value={glassOpacity}
            onChange={(e) => updateGlassOpacity(Number(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <p className="text-white/40 text-sm mt-2">Controls how opaque the frosted glass panels appear.</p>
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Account</h3>
        <p className="text-white/60 mb-4">Additional integrations and settings.</p>
        <div className="space-y-3">
          <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Custom Domain</p>
              <p className="text-white/50 text-sm">Use your own domain for QR tracking</p>
            </div>
            <span className="bg-white/20 text-white/60 px-3 py-1 rounded-full text-sm">Coming Soon</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
