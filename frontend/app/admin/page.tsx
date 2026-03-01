"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "shared-components"
import {
  Users,
  QrCode,
  ScanLine,
  DollarSign,
  TicketCheck,
  ListTodo,
  TrendingUp,
  CreditCard,
  ArrowRight,
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Business overview</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-5">
              <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      label: "Total Users",
      value: stats.users.total,
      sub: `+${stats.users.new_30d} this month`,
      icon: Users,
      color: "blue",
      href: "/admin/users",
    },
    {
      label: "Active Campaigns",
      value: stats.campaigns.active,
      sub: `${stats.campaigns.total} total`,
      icon: QrCode,
      color: "purple",
    },
    {
      label: "Scans (30d)",
      value: stats.scans.last_30d.toLocaleString(),
      sub: `${stats.scans.last_7d.toLocaleString()} this week`,
      icon: ScanLine,
      color: "green",
    },
    {
      label: "Revenue (30d)",
      value: `$${stats.revenue.last_30d_aud.toLocaleString()} AUD`,
      sub: `${stats.scans.billable_30d} billable scans`,
      icon: DollarSign,
      color: "emerald",
      href: "/admin/billing",
    },
    {
      label: "Active Subscribers",
      value: stats.billing.active_subscribers,
      sub: `$${stats.revenue.price_per_scan_aud}/scan`,
      icon: CreditCard,
      color: "cyan",
      href: "/admin/billing",
    },
    {
      label: "Total Scans",
      value: stats.scans.total.toLocaleString(),
      sub: "All time",
      icon: TrendingUp,
      color: "indigo",
    },
    {
      label: "Open Tickets",
      value: stats.support.open_tickets,
      sub: "Needs attention",
      icon: TicketCheck,
      color: stats.support.open_tickets > 0 ? "yellow" : "green",
      href: "/admin/tickets",
    },
    {
      label: "Pending Tasks",
      value: stats.tasks.pending,
      sub: "Dev backlog",
      icon: ListTodo,
      color: stats.tasks.pending > 5 ? "orange" : "blue",
      href: "/admin/tasks",
    },
  ]

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-400",
    purple: "bg-purple-500/20 text-purple-400",
    green: "bg-green-500/20 text-green-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
    indigo: "bg-indigo-500/20 text-indigo-400",
    yellow: "bg-yellow-500/20 text-yellow-400",
    orange: "bg-orange-500/20 text-orange-400",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/50 text-sm mt-1">Business overview at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const content = (
            <Card key={card.label} variant="glass" className="p-5 group hover:bg-white/[0.08] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${colorMap[card.color]} flex items-center justify-center`}>
                  <card.icon className="h-5 w-5" />
                </div>
                {card.href && (
                  <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-white/50 transition-colors" />
                )}
              </div>
              <p className="text-2xl font-bold text-white">{card.value}</p>
              <p className="text-white/40 text-sm mt-1">{card.sub}</p>
              <p className="text-white/60 text-xs font-medium mt-2">{card.label}</p>
            </Card>
          )

          return card.href ? (
            <Link key={card.label} href={card.href}>
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          )
        })}
      </div>

      {/* Quick links */}
      <Card variant="glass" className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/admin/tickets?status=open">
            <div className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors">
              <TicketCheck className="h-5 w-5 text-yellow-400 mb-2" />
              <p className="text-white text-sm font-medium">Review Open Tickets</p>
              <p className="text-white/40 text-xs mt-1">{stats.support.open_tickets} waiting</p>
            </div>
          </Link>
          <Link href="/admin/tasks">
            <div className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors">
              <ListTodo className="h-5 w-5 text-blue-400 mb-2" />
              <p className="text-white text-sm font-medium">Dev Task Board</p>
              <p className="text-white/40 text-xs mt-1">{stats.tasks.pending} pending</p>
            </div>
          </Link>
          <Link href="/admin/users">
            <div className="bg-white/5 hover:bg-white/10 rounded-xl p-4 transition-colors">
              <Users className="h-5 w-5 text-purple-400 mb-2" />
              <p className="text-white text-sm font-medium">Manage Users</p>
              <p className="text-white/40 text-xs mt-1">{stats.users.total} accounts</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  )
}
