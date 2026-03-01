"use client"

import { useState, useEffect } from "react"
import { Card } from "shared-components"
import {
  DollarSign,
  TrendingUp,
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

export default function AdminBillingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [billingUsers, setBillingUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/users?limit=100").then((r) => r.json()),
    ])
      .then(([statsData, usersData]) => {
        setStats(statsData)
        setBillingUsers(usersData.users || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-white/50 text-sm mt-1">Revenue and subscription overview</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-5">
              <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
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
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-white/50 text-sm mt-1">Revenue and subscription overview</p>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card variant="glass" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium uppercase">Revenue (30d)</p>
              <p className="text-2xl font-bold text-white">${stats.revenue.last_30d_aud.toLocaleString()}</p>
              <p className="text-white/40 text-xs mt-1">AUD</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ScanLine className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium uppercase">Billable Scans (30d)</p>
              <p className="text-2xl font-bold text-white">{stats.scans.billable_30d}</p>
              <p className="text-white/40 text-xs mt-1">${stats.revenue.price_per_scan_aud}/scan</p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs font-medium uppercase">Active Subscribers</p>
              <p className="text-2xl font-bold text-white">{stats.billing.active_subscribers}</p>
              <p className="text-white/40 text-xs mt-1">of {stats.users.total} total users</p>
            </div>
          </div>
        </Card>
      </div>

      {/* User breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="glass" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <p className="text-white/60 text-sm font-medium">Active</p>
          </div>
          <p className="text-xl font-bold text-white">{subscribedUsers.length}</p>
          <p className="text-white/40 text-xs mt-1">Paying subscribers</p>
        </Card>
        <Card variant="glass" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <p className="text-white/60 text-sm font-medium">Degraded</p>
          </div>
          <p className="text-xl font-bold text-white">{degradedUsers.length}</p>
          <p className="text-white/40 text-xs mt-1">Past spend cap or failed payment</p>
        </Card>
        <Card variant="glass" className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <p className="text-white/60 text-sm font-medium">Free</p>
          </div>
          <p className="text-xl font-bold text-white">{freeUsers.length}</p>
          <p className="text-white/40 text-xs mt-1">No subscription yet</p>
        </Card>
      </div>

      {/* Subscribers list */}
      <Card variant="glass" className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Active Subscribers</h2>
        {subscribedUsers.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">No active subscribers yet</p>
        ) : (
          <div className="space-y-3">
            {subscribedUsers.map((user) => (
              <div key={user.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-300 text-xs font-medium shrink-0">
                    {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.full_name || user.email}</p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
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
        <Card variant="glass" className="p-6 border-red-500/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Degraded Users</h2>
          </div>
          <div className="space-y-3">
            {degradedUsers.map((user) => (
              <div key={user.id} className="bg-red-500/5 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-300 text-xs font-medium shrink-0">
                    {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.full_name || user.email}</p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
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
