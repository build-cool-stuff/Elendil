"use client"

import { useState, useRef, useEffect } from "react"
import { useClerk } from "@clerk/nextjs"
import { Shader, ChromaFlow, Swirl } from "shaders/react"
import { GrainOverlay } from "@/components/grain-overlay"
import { Card, Button } from "shared-components"
import { QRCodeGenerator } from "@/components/dashboard/qr-code-generator"
import {
  Settings,
  LogOut,
  HelpCircle,
  QrCode,
  MapPin,
  Facebook,
  Mail,
} from "lucide-react"

type TabId = "qr-code" | "map" | "campaigns" | "settings" | "support"

export function CRMDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("qr-code")
  const shaderContainerRef = useRef<HTMLDivElement>(null)
  const [isShaderLoaded, setIsShaderLoaded] = useState(false)
  const { signOut } = useClerk()

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: "/" })
    } catch (error) {
      console.error("Logout failed:", error)
      // Fallback: redirect manually
      window.location.href = "/"
    }
  }

  useEffect(() => {
    const checkShaderReady = () => {
      if (shaderContainerRef.current) {
        const canvas = shaderContainerRef.current.querySelector("canvas")
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          setIsShaderLoaded(true)
          return true
        }
      }
      return false
    }

    if (checkShaderReady()) return

    const intervalId = setInterval(() => {
      if (checkShaderReady()) {
        clearInterval(intervalId)
      }
    }, 100)

    const fallbackTimer = setTimeout(() => {
      setIsShaderLoaded(true)
    }, 1500)

    return () => {
      clearInterval(intervalId)
      clearTimeout(fallbackTimer)
    }
  }, [])

  const navItems: { icon: typeof QrCode; label: string; id: TabId }[] = [
    { icon: QrCode, label: "QR Code", id: "qr-code" },
    { icon: MapPin, label: "Map", id: "map" },
    { icon: Facebook, label: "Campaigns", id: "campaigns" },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "qr-code":
        return <QRCodeGenerator />
      case "map":
        return <MapPlaceholder />
      case "campaigns":
        return <CampaignsPlaceholder />
      case "settings":
        return <SettingsPanel />
      case "support":
        return <SupportPanel />
      default:
        return <QRCodeGenerator />
    }
  }

  return (
    <div className="h-screen relative overflow-hidden bg-background">
      <GrainOverlay />

      {/* WebGL Shader Background */}
      <div
        ref={shaderContainerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${isShaderLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ contain: "strict" }}
      >
        <Shader className="h-full w-full">
          <Swirl
            colorA="#1275d8"
            colorB="#e19136"
            speed={0.8}
            detail={0.8}
            blend={50}
            coarseX={40}
            coarseY={40}
            mediumX={40}
            mediumY={40}
            fineX={40}
            fineY={40}
          />
          <ChromaFlow
            baseColor="#0066ff"
            upColor="#0066ff"
            downColor="#d1d1d1"
            leftColor="#e19136"
            rightColor="#e19136"
            intensity={0.9}
            radius={1.8}
            momentum={25}
            maskType="alpha"
            opacity={0.97}
          />
        </Shader>
        {/* Dark overlay for better content contrast */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content Layer */}
      <div
        className={`relative z-10 p-6 grid grid-cols-12 gap-6 h-screen transition-opacity duration-700 ${
          isShaderLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Left Sidebar Card */}
        <Card variant="glass" className="col-span-2 p-6 pb-6 h-fit flex flex-col">
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex flex-col items-center">
              <img src="/logo.png" alt="Elendil" className="h-12 w-auto mb-2" />
              <p className="text-white/60 text-sm">QR Tracking Platform</p>
            </div>

            {/* Main Navigation */}
            <div>
              <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3 pl-3">Main Menu</h4>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "glass-active" : "glass"}
                    className="w-full h-11 px-3 flex items-center justify-start"
                    onClick={() => setActiveTab(item.id)}
                  >
                    <span className="w-6 flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="ml-3 text-sm font-medium">{item.label}</span>
                  </Button>
                ))}
              </nav>
            </div>

            {/* Administration */}
            <div>
              <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3 pl-3">Administration</h4>
              <nav className="flex flex-col gap-1">
                <Button
                  variant={activeTab === "settings" ? "glass-active" : "glass"}
                  className="w-full h-11 px-3 flex items-center justify-start"
                  onClick={() => setActiveTab("settings")}
                >
                  <span className="w-6 flex items-center justify-center shrink-0">
                    <Settings className="h-5 w-5" />
                  </span>
                  <span className="ml-3 text-sm font-medium">Settings</span>
                </Button>
                <Button
                  variant={activeTab === "support" ? "glass-active" : "glass"}
                  className="w-full h-11 px-3 flex items-center justify-start"
                  onClick={() => setActiveTab("support")}
                >
                  <span className="w-6 flex items-center justify-center shrink-0">
                    <HelpCircle className="h-5 w-5" />
                  </span>
                  <span className="ml-3 text-sm font-medium">Support</span>
                </Button>
                <Button
                  variant="glass"
                  className="w-full h-11 px-3 flex items-center justify-start"
                  onClick={handleLogout}
                >
                  <span className="w-6 flex items-center justify-center shrink-0">
                    <LogOut className="h-5 w-5" />
                  </span>
                  <span className="ml-3 text-sm font-medium">Logout</span>
                </Button>
              </nav>
            </div>
          </div>
        </Card>

        {/* Main Content Area */}
        <div className="col-span-10 space-y-6 h-screen overflow-y-auto pb-6">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

// Placeholder components for tabs not yet implemented
function MapPlaceholder() {
  return (
    <Card variant="glass" className="p-6">
      <div className="text-center py-16">
        <MapPin className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Heat Map</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Visualize where your QR codes are being scanned with an interactive heat map.
          This feature will show scan locations by suburb.
        </p>
        <span className="inline-block mt-4 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium">
          Coming Soon
        </span>
      </div>
    </Card>
  )
}

function CampaignsPlaceholder() {
  return (
    <Card variant="glass" className="p-6">
      <div className="text-center py-16">
        <Facebook className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Meta Campaigns</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Connect your Meta (Facebook/Instagram) ad account to track attribution
          between QR code scans and ad conversions.
        </p>
        <span className="inline-block mt-4 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium">
          Coming Soon
        </span>
      </div>
    </Card>
  )
}

function SettingsPanel() {
  const [glassOpacity, setGlassOpacity] = useState(25)
  const [metaPixelId, setMetaPixelId] = useState("")
  const [originalPixelId, setOriginalPixelId] = useState("")
  const [isLoadingPixel, setIsLoadingPixel] = useState(true)
  const [isSavingPixel, setIsSavingPixel] = useState(false)
  const [pixelSaveStatus, setPixelSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Fetch user settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings")
        if (res.ok) {
          const data = await res.json()
          setMetaPixelId(data.meta_pixel_id || "")
          setOriginalPixelId(data.meta_pixel_id || "")
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

function SupportPanel() {
  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <div className="text-center py-8">
          <Mail className="w-14 h-14 text-white/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Talk Directly to the Founder</h2>
          <p className="text-white/70 max-w-lg mx-auto mb-6 leading-relaxed">
            You're not just a user - you're one of our first customers, and that means everything to us.
            I personally read and respond to every single message. No support tickets, no chatbots, just a real conversation.
          </p>
          <a
            href="mailto:toanandvarghese@outlook.com?subject=Elendil Support"
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium"
          >
            <Mail className="h-5 w-5" />
            toanandvarghese@outlook.com
          </a>
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">What to Expect</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-green-400 text-lg">⚡</span>
            </div>
            <div>
              <p className="text-white font-medium">24-Hour Response Time</p>
              <p className="text-white/60 text-sm">I'll get back to you within 24 hours, usually much faster.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-blue-400 text-lg">💬</span>
            </div>
            <div>
              <p className="text-white font-medium">Real Conversations</p>
              <p className="text-white/60 text-sm">No canned responses. I want to understand your needs and help you succeed.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <span className="text-purple-400 text-lg">🚀</span>
            </div>
            <div>
              <p className="text-white font-medium">Your Feedback Shapes the Product</p>
              <p className="text-white/60 text-sm">As an early user, your input directly influences what we build next.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <p className="text-white/50 text-sm text-center italic">
          "The best thing about being small is you can provide a level of service no big company can." - Y Combinator
        </p>
      </Card>
    </div>
  )
}
