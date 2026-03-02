"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useClerk } from "@clerk/nextjs"
import { Card, Button } from "shared-components"
import { GrainOverlay } from "@/components/grain-overlay"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TicketCheck,
  ListTodo,
  StickyNote,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/admin/tasks", label: "Dev Tasks", icon: ListTodo },
  { href: "/admin/notes", label: "Notes", icon: StickyNote },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname.startsWith(href)
  }

  return (
    <div className="h-screen relative overflow-hidden bg-[#0a0a0f]">
      <GrainOverlay />

      {/* Subtle gradient background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-[#0a0a0f] to-purple-950/20" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 md:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full p-4 overflow-y-auto backdrop-blur-[40px] bg-white/[0.08] border-r border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-white font-semibold">Admin</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidebarContent
            pathname={pathname}
            isActive={isActive}
            onLogout={() => signOut({ redirectUrl: "/" })}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {/* Main layout */}
      <div className="relative z-10 flex h-screen">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 shrink-0 p-4">
          <Card variant="glass" className="h-full p-4 flex flex-col">
            <SidebarContent
              pathname={pathname}
              isActive={isActive}
              onLogout={() => signOut({ redirectUrl: "/" })}
            />
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
          {/* Mobile header */}
          <div className="flex items-center gap-3 mb-4 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="text-white font-semibold">Admin Panel</span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarContent({
  pathname,
  isActive,
  onLogout,
  onNavigate,
}: {
  pathname: string
  isActive: (href: string) => boolean
  onLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <>
      {/* Logo / Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
          <Shield className="h-5 w-5 text-blue-400" />
        </div>
        <p className="text-white font-semibold">Admin Panel</p>
        <p className="text-white/40 text-xs">Business Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        <h4 className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2 pl-3">Overview</h4>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <Button
              variant={isActive(item.href) ? "glass-active" : "glass"}
              className="w-full h-10 px-3 flex items-center justify-start"
            >
              <span className="w-5 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4" />
              </span>
              <span className="ml-3 text-sm font-medium">{item.label}</span>
            </Button>
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-1">
        <Link href="/dashboard?from=user" onClick={onNavigate}>
          <Button variant="glass" className="w-full h-10 px-3 flex items-center justify-start">
            <span className="w-5 flex items-center justify-center shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="ml-3 text-sm font-medium">User Dashboard</span>
          </Button>
        </Link>
        <Button
          variant="glass"
          className="w-full h-10 px-3 flex items-center justify-start"
          onClick={onLogout}
        >
          <span className="w-5 flex items-center justify-center shrink-0">
            <LogOut className="h-4 w-4" />
          </span>
          <span className="ml-3 text-sm font-medium">Logout</span>
        </Button>
      </div>
    </>
  )
}
