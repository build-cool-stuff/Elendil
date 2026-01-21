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
} from "lucide-react"

type TabId = "qr-code" | "map" | "campaigns" | "settings"

export function CRMDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("qr-code")
  const shaderContainerRef = useRef<HTMLDivElement>(null)
  const [isShaderLoaded, setIsShaderLoaded] = useState(false)
  const { signOut } = useClerk()

  const handleLogout = () => {
    signOut({ redirectUrl: "/" })
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
        return <SettingsPlaceholder />
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
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Free Real Estate</h1>
              <p className="text-white/60 text-sm">QR Tracking Platform</p>
            </div>

            {/* Main Navigation */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Main Menu</h4>
              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "glass-active" : "glass"}
                    className="w-full justify-start text-base h-11"
                    onClick={() => setActiveTab(item.id)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </div>

            {/* Administration */}
            <div>
              <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Administration</h4>
              <nav className="space-y-2">
                <Button
                  variant={activeTab === "settings" ? "glass-active" : "glass"}
                  className="w-full justify-start text-base h-11"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </Button>
                <Button
                  variant="glass"
                  className="w-full justify-start text-base h-11"
                >
                  <HelpCircle className="mr-3 h-5 w-5" />
                  Support
                </Button>
                <Button
                  variant="glass"
                  className="w-full justify-start text-base h-11"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
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
        <MapPin className="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Heat Map</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Visualize where your QR codes are being scanned with an interactive heat map.
          This feature will show scan locations by suburb.
        </p>
        <span className="inline-block mt-4 bg-blue-500/20 text-blue-400 border border-blue-400/30 px-3 py-1 rounded-full text-sm">
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
        <Facebook className="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Meta Campaigns</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Connect your Meta (Facebook/Instagram) ad account to track attribution
          between QR code scans and ad conversions.
        </p>
        <span className="inline-block mt-4 bg-blue-500/20 text-blue-400 border border-blue-400/30 px-3 py-1 rounded-full text-sm">
          Coming Soon
        </span>
      </div>
    </Card>
  )
}

function SettingsPlaceholder() {
  return (
    <Card variant="glass" className="p-6">
      <div className="text-center py-16">
        <Settings className="w-16 h-16 text-white/30 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Settings</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Configure your account settings, connect Meta integration,
          and manage your subscription.
        </p>
        <span className="inline-block mt-4 bg-blue-500/20 text-blue-400 border border-blue-400/30 px-3 py-1 rounded-full text-sm">
          Coming Soon
        </span>
      </div>
    </Card>
  )
}
