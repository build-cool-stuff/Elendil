"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { Button } from "shared-components"
import {
  Settings,
  LogOut,
  HelpCircle,
  QrCode,
  MapPin,
  Facebook,
  CreditCard,
} from "lucide-react"

type NavItem = {
  icon: typeof QrCode
  label: string
  href: string
}

const mainNavItems: NavItem[] = [
  { icon: QrCode, label: "QR Code", href: "/dashboard" },
  { icon: MapPin, label: "Map", href: "/dashboard/map" },
  { icon: Facebook, label: "Campaigns", href: "/dashboard/campaigns" },
]

const adminNavItems: NavItem[] = [
  { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  { icon: HelpCircle, label: "Support", href: "/dashboard/support" },
]

function NavLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Button
      variant={isActive ? "glass-active" : "glass"}
      className="w-full h-11 px-3 flex items-center justify-start"
      asChild
    >
      <Link href={item.href} onClick={onClick}>
        <span className="w-6 flex items-center justify-center shrink-0">
          <item.icon className="h-5 w-5" />
        </span>
        <span className="ml-3 text-sm font-medium">{item.label}</span>
      </Link>
    </Button>
  )
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { signOut } = useClerk()

  const isActive = (href: string) => {
    // /dashboard is the QR Code tab (default/index route)
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/qr-code"
    }
    return pathname === href
  }

  const handleLogout = async () => {
    try {
      await signOut({ redirectUrl: "/" })
    } catch (error) {
      console.error("Logout failed:", error)
      window.location.href = "/"
    }
  }

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
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} onClick={onNavigate} />
          ))}
        </nav>
      </div>

      {/* Administration */}
      <div>
        <h4 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3 pl-3">Administration</h4>
        <nav className="flex flex-col gap-1">
          {adminNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} onClick={onNavigate} />
          ))}
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
  )
}
