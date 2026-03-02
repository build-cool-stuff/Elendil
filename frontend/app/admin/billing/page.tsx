"use client"

import { useState, useEffect } from "react"
import { Card } from "shared-components"
import { toast } from "sonner"
import {
  DollarSign,
  Users,
  CreditCard,
  AlertTriangle,
  ScanLine,
} from "lucide-react"

interface Stats {
  users: { total: number; new_30d: number }
  campaigns: { total: number; active: number }
  scans: { total: number; last_30d: number; last_7d: number; billable_30d: number }
  revenue: { last_30d_aud: number; price_per_scan_aud: number }
  billing: { active_subscribers: number }
  support: { open_tickets: number }
  tasks: { pending: number }
}

interface UserWithStats {
  id: string
  email: string
  full_name: string | null
  billing_active: boolean
  stripe_customer_id: string | null
  degraded_since: string | null
  created_at: string
  stats: {
    campaign_count: number
    scan_count: number
    last_scan: string | null
  }
}

const avatarColors = [
  "bg-blue-500/20 text-blue-300",
  "bg-purple-500/20 text-purple-300",
  "bg-emerald-500/20 text-emerald-300",
  "bg-cyan-500/20 text-cyan-300",
  "bg-pink-500/20 text-pink-300",
]

function getUserColor(email: string) {
  return avatarColors[email.charCodeAt(0) % avatarColors.length]
}

export default function AdminBillingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [billingUsers, setBillingUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => {
        if (!r.ok) throw new Error("Failed to load stats")
        return r.json()
      }),
      fetch("/api/admin/users?limit=100").then((r) => {
        if (!r.ok) throw new Error("Failed to load users")
        return r.json()
      }),
    ])
      .then(([statsData, usersData]) => {
        setStats(statsData)
        setBillingUsers(usersData.users || [])
      })
      .catch((err) => {
        toast.error("Failed to load billing data")
        console.error(err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Billing</h1>
            <p className="text-white/50 text-sm mt-1">Revenue and subscription overview</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                  <div className="h-7 w-20 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-5">
              <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const subscribedUsers = billingUsers.filter((u) => u.billing_active)
  const degradedUsers = billingUsers.filter((u) => u.degraded_since)
  const freeUsers = billingUsers.filter((u) => !u.billing_active && !u.stripe_customer_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-white/50 text-sm mt-1">Revenue and subscription overview</p>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card variant="glass" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white/40 text-xs font-medium uppercase">Revenue (30d)</p>
              <p className="text-2xl font-bold text-white truncate">${stats.revenue.last_30d_aud.toLocaleString()}</p>
              <p className="text-white/30 text-xs mt-1">AUD</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <ScanLine className="h-5 w-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white/40 text-xs font-medium uppercase">Billable Scans (30d)</p>
              <p className="text-2xl font-bold text-white">{stats.scans.billable_30d}</p>
              <p className="text-white/30 text-xs mt-1">${stats.revenue.price_per_scan_aud}/scan</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <p className="text-white/40 text-xs font-medium uppercase">Active Subscribers</p>
              <p className="text-2xl font-bold text-white">{stats.billing.active_subscribers}</p>
              <p className="text-white/30 text-xs mt-1">of {stats.users.total} total users</p>
            </div>
          </div>
        </Card>
      </div>

      {/* User breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card variant="glass" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-white/60 text-sm font-medium">Active</p>
          </div>
          <p className="text-xl font-bold text-white">{subscribedUsers.length}</p>
          <p className="text-white/30 text-xs mt-1">Paying subscribers</p>
        </Card>
        <Card variant="glass" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <p className="text-white/60 text-sm font-medium">Degraded</p>
          </div>
          <p className="text-xl font-bold text-white">{degradedUsers.length}</p>
          <p className="text-white/30 text-xs mt-1">Past spend cap or failed payment</p>
        </Card>
        <Card variant="glass" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-white/30" />
            <p className="text-white/60 text-sm font-medium">Free</p>
          </div>
          <p className="text-xl font-bold text-white">{freeUsers.length}</p>
          <p className="text-white/30 text-xs mt-1">No subscription yet</p>
        </Card>
      </div>

      {/* Subscribers list */}
      <Card variant="glass" className="p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Active Subscribers</h2>
        {subscribedUsers.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCard className="h-8 w-8 mx-auto mb-3 text-white/20" />
            <p className="text-white/40 text-sm">No active subscribers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subscribedUsers.map((user) => (
              <div key={user.id} className="bg-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full ${getUserColor(user.email)} flex items-center justify-center text-xs font-medium shrink-0`}>
                    {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.full_name || user.email}</p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 sm:ml-4 ml-11">
                  <p className="text-white text-sm font-medium">{user.stats.scan_count} scans</p>
                  <p className="text-white/40 text-xs">{user.stats.campaign_count} campaigns</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Degraded users */}
      {degradedUsers.length > 0 && (
        <Card variant="glass" className="p-4 sm:p-6 ring-1 ring-red-500/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Degraded Users</h2>
          </div>
          <div className="space-y-3">
            {degradedUsers.map((user) => (
              <div key={user.id} className="bg-red-500/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-300 text-xs font-medium shrink-0">
                    {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.full_name || user.email}</p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 sm:ml-4 ml-11">
                  <p className="text-red-300 text-xs font-medium">
                    Since {user.degraded_since ? new Date(user.degraded_since).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
