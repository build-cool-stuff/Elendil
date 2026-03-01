"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useClerk, useUser } from "@clerk/nextjs"
import Link from "next/link"
import { toast } from "sonner"
import { Drawer } from "vaul"
import { Shader, ChromaFlow, Swirl } from "shaders/react"
import { GrainOverlay } from "@/components/grain-overlay"
import { Card, Button } from "shared-components"
import { QRCodeGenerator } from "@/components/dashboard/qr-code-generator"
import { BillingPanel } from "@/components/dashboard/billing-panel"
import { BillingWarnings } from "@/components/dashboard/billing-warnings"
import { useCampaigns } from "@/hooks/use-campaigns"
import { useEdgeSwipe } from "@/hooks/use-edge-swipe"
import {
  Settings,
  LogOut,
  HelpCircle,
  QrCode,
  MapPin,
  Facebook,
  CreditCard,
  Mail,
  ExternalLink,
  Menu,
  Shield,
} from "lucide-react"

type TabId = "qr-code" | "map" | "campaigns" | "billing" | "settings" | "support"

export function CRMDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("qr-code")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const shaderContainerRef = useRef<HTMLDivElement>(null)
  const [isShaderLoaded, setIsShaderLoaded] = useState(false)
  const { signOut } = useClerk()
  const { campaigns, isLoading: campaignsLoading, mutate: mutateCampaigns } = useCampaigns()
  const searchParams = useSearchParams()
  const [billingKey, setBillingKey] = useState(0)

  // Swipe from left edge to open mobile drawer
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  useEdgeSwipe(openDrawer)

  // Handle ?billing=success or ?billing=canceled from Stripe redirect
  useEffect(() => {
    const billingParam = searchParams.get("billing")
    if (!billingParam) return

    if (billingParam === "success") {
      setActiveTab("billing")
      setBillingKey((k) => k + 1) // Force billing panel to re-fetch
      toast.success("Billing setup complete! Your subscription is now active.")
    } else if (billingParam === "canceled") {
      toast.info("Billing setup was canceled. You can try again anytime.")
    }

    // Clear the query param from the URL
    const url = new URL(window.location.href)
    url.searchParams.delete("billing")
    window.history.replaceState({}, "", url.pathname)
  }, [searchParams])

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

      {/* Mobile Drawer */}
      <Drawer.Root direction="left" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
          <Drawer.Content
            className="fixed inset-y-0 left-0 z-50 w-72 md:hidden focus:outline-none"
            aria-label="Navigation menu"
          >
            <div className="h-full p-4 overflow-y-auto backdrop-blur-[40px] bg-white/[0.12] border-r border-white/20">
              <SidebarNav
                navItems={navItems}
                activeTab={activeTab}
                onTabChange={(id) => { setActiveTab(id); setDrawerOpen(false) }}
                onLogout={handleLogout}
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Content Layer */}
      <div
        className={`relative z-10 p-4 md:p-6 flex flex-col md:grid md:grid-cols-12 md:gap-6 h-screen transition-opacity duration-700 ${
          isShaderLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center gap-3 mb-4 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:bg-white/20 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src="/logo.png" alt="Elendil" className="h-8 w-auto" />
        </div>

        {/* Desktop Sidebar */}
        <Card variant="glass" className="hidden md:flex col-span-2 p-6 pb-6 h-fit flex-col">
          <SidebarNav
            navItems={navItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
          />
        </Card>

        {/* Main Content Area — all tabs stay mounted, hidden via CSS */}
        <div className="flex-1 md:col-span-10 h-0 md:h-screen overflow-y-auto pb-6 min-h-0">
          <BillingWarnings />
          <div style={{ display: activeTab === "qr-code" ? undefined : "none" }} className="space-y-6">
            <QRCodeGenerator campaigns={campaigns} isLoading={campaignsLoading} mutate={mutateCampaigns} />
          </div>
          <div style={{ display: activeTab === "map" ? undefined : "none" }} className="space-y-6">
            <MapPlaceholder />
          </div>
          <div style={{ display: activeTab === "campaigns" ? undefined : "none" }} className="space-y-6">
            <CampaignsPlaceholder />
          </div>
          <div style={{ display: activeTab === "billing" ? undefined : "none" }} className="space-y-6">
            <BillingPanel key={billingKey} />
          </div>
          <div style={{ display: activeTab === "settings" ? undefined : "none" }} className="space-y-6">
            <SettingsPanel />
          </div>
          <div style={{ display: activeTab === "support" ? undefined : "none" }} className="space-y-6">
            <SupportPanel />
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarNav({
  navItems,
  activeTab,
  onTabChange,
  onLogout,
}: {
  navItems: { icon: typeof QrCode; label: string; id: TabId }[]
  activeTab: TabId
  onTabChange: (id: TabId) => void
  onLogout: () => void
}) {
  const { user } = useUser()
  const isAdmin = user?.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID
  return (
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
              onClick={() => onTabChange(item.id)}
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
            variant={activeTab === "billing" ? "glass-active" : "glass"}
            className="w-full h-11 px-3 flex items-center justify-start"
            onClick={() => onTabChange("billing")}
          >
            <span className="w-6 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="ml-3 text-sm font-medium">Billing</span>
          </Button>
          <Button
            variant={activeTab === "settings" ? "glass-active" : "glass"}
            className="w-full h-11 px-3 flex items-center justify-start"
            onClick={() => onTabChange("settings")}
          >
            <span className="w-6 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5" />
            </span>
            <span className="ml-3 text-sm font-medium">Settings</span>
          </Button>
          <Button
            variant={activeTab === "support" ? "glass-active" : "glass"}
            className="w-full h-11 px-3 flex items-center justify-start"
            onClick={() => onTabChange("support")}
          >
            <span className="w-6 flex items-center justify-center shrink-0">
              <HelpCircle className="h-5 w-5" />
            </span>
            <span className="ml-3 text-sm font-medium">Support</span>
          </Button>
          {isAdmin && (
            <Link href="/admin">
              <Button
                variant="glass"
                className="w-full h-11 px-3 flex items-center justify-start bg-blue-500/10 hover:bg-blue-500/20"
              >
                <span className="w-6 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-blue-400" />
                </span>
                <span className="ml-3 text-sm font-medium text-blue-300">Admin Panel</span>
              </Button>
            </Link>
          )}
          <Button
            variant="glass"
            className="w-full h-11 px-3 flex items-center justify-start"
            onClick={onLogout}
          >
            <span className="w-6 flex items-center justify-center shrink-0">
              <LogOut className="h-5 w-5" />
            </span>
            <span className="ml-3 text-sm font-medium">Logout</span>
          </Button>
        </nav>
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

function SupportPanel() {
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [tickets, setTickets] = useState<Array<{ id: string; subject: string; status: string; priority: string; created_at: string }>>([])
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)

  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true)
    try {
      const res = await fetch("/api/support/tickets")
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingTickets(false)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), priority }),
      })

      if (!res.ok) {
        const data = await res.json()
        setSubmitStatus({ type: "error", message: data.error || "Failed to submit ticket" })
        return
      }

      setSubmitStatus({ type: "success", message: "Ticket submitted! We'll get back to you soon." })
      setSubject("")
      setMessage("")
      setPriority("medium")
      setShowForm(false)
      loadTickets()
      setTimeout(() => setSubmitStatus(null), 5000)
    } catch {
      setSubmitStatus({ type: "error", message: "Failed to submit ticket" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusColors: Record<string, string> = {
    open: "bg-yellow-500/20 text-yellow-300",
    in_progress: "bg-blue-500/20 text-blue-300",
    resolved: "bg-green-500/20 text-green-300",
    closed: "bg-white/10 text-white/50",
  }

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <div className="text-center py-8">
          <Mail className="w-14 h-14 text-white/50 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Need Help?</h2>
          <p className="text-white/70 max-w-lg mx-auto mb-6 leading-relaxed">
            Submit a support ticket and we'll get back to you within 24 hours. You can also email us directly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="glass"
              className="h-12 px-6 bg-blue-500/20 hover:bg-blue-500/30"
              onClick={() => setShowForm(!showForm)}
            >
              <HelpCircle className="h-5 w-5 mr-2" />
              {showForm ? "Cancel" : "Submit a Ticket"}
            </Button>
            <a
              href="mailto:toanandvarghese@outlook.com?subject=Elendil Support"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium text-sm"
            >
              <Mail className="h-4 w-4" />
              toanandvarghese@outlook.com
            </a>
          </div>
        </div>
      </Card>

      {submitStatus && (
        <Card variant="glass" className={`p-4 ${submitStatus.type === "success" ? "border-green-500/30" : "border-red-500/30"}`}>
          <p className={`text-sm ${submitStatus.type === "success" ? "text-green-300" : "text-red-300"}`}>
            {submitStatus.message}
          </p>
        </Card>
      )}

      {showForm && (
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">New Support Ticket</h3>
          <div className="space-y-4">
            <div>
              <label className="text-white/80 font-medium text-sm block mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full h-12 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="text-white/80 font-medium text-sm block mb-2">Priority</label>
              <div className="flex gap-2">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      priority === p
                        ? p === "high" ? "bg-red-500/30 text-red-300 border border-red-500/40"
                        : p === "medium" ? "bg-yellow-500/30 text-yellow-300 border border-yellow-500/40"
                        : "bg-green-500/30 text-green-300 border border-green-500/40"
                        : "bg-white/10 text-white/60 border border-white/10 hover:bg-white/15"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-white/80 font-medium text-sm block mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={5}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-none"
              />
            </div>
            <Button
              variant="glass"
              className="h-12 px-8 bg-blue-500/20 hover:bg-blue-500/30"
              onClick={handleSubmit}
              disabled={isSubmitting || !subject.trim() || !message.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </Card>
      )}

      {tickets.length > 0 && (
        <Card variant="glass" className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Your Tickets</h3>
          <div className="space-y-3">
            {isLoadingTickets ? (
              <div className="h-20 bg-white/10 rounded-xl animate-pulse" />
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{ticket.subject}</p>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[ticket.status] || "bg-white/10 text-white/50"}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <Card variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">What to Expect</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <span className="text-green-400 text-lg">⚡</span>
            </div>
            <div>
              <p className="text-white font-medium">24-Hour Response Time</p>
              <p className="text-white/60 text-sm">We'll get back to you within 24 hours, usually much faster.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-blue-400 text-lg">💬</span>
            </div>
            <div>
              <p className="text-white font-medium">Real Conversations</p>
              <p className="text-white/60 text-sm">No canned responses. We want to understand your needs and help you succeed.</p>
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
    </div>
  )
}
