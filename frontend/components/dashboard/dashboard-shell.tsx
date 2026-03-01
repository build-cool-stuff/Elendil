"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { Drawer } from "vaul"
import { GrainOverlay } from "@/components/grain-overlay"
import { Card } from "shared-components"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { BillingWarnings } from "@/components/dashboard/billing-warnings"
import { useEdgeSwipe } from "@/hooks/use-edge-swipe"
import { Menu } from "lucide-react"

const ShaderBackground = dynamic(
  () => import("@/components/shader-background").then((m) => m.ShaderBackground),
  { ssr: false }
)

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Swipe from left edge to open mobile drawer
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  useEdgeSwipe(openDrawer)

  // Close drawer on navigation
  const handleNavigate = useCallback(() => setDrawerOpen(false), [])

  return (
    <div className="h-screen relative overflow-hidden bg-background">
      <GrainOverlay />

      {/* WebGL Shader Background — lazy loaded, no SSR */}
      <ShaderBackground />

      {/* Mobile Drawer */}
      <Drawer.Root direction="left" open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
          <Drawer.Content
            className="fixed inset-y-0 left-0 z-50 w-72 md:hidden focus:outline-none"
            aria-label="Navigation menu"
          >
            <div className="h-full p-4 overflow-y-auto backdrop-blur-[20px] bg-white/[0.12] border-r border-white/20">
              <SidebarNav onNavigate={handleNavigate} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Content Layer */}
      <div className="relative z-10 p-4 md:p-6 flex flex-col md:grid md:grid-cols-12 md:gap-6 h-screen">
        {/* Mobile Header */}
        <div className="flex items-center gap-3 mb-4 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white active:bg-white/20 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src="/logo.png" alt="Elendil" className="h-8 w-auto" />
        </div>

        {/* Desktop Sidebar */}
        <Card variant="glass" className="hidden md:flex col-span-2 p-6 pb-6 h-fit flex-col">
          <SidebarNav />
        </Card>

        {/* Main Content Area */}
        <div className="flex-1 md:col-span-10 h-0 md:h-screen overflow-y-auto pb-6 min-h-0">
          <BillingWarnings />
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
