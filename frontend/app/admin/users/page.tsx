"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, Button } from "shared-components"
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  QrCode,
  CreditCard,
  AlertTriangle,
} from "lucide-react"

interface UserWithStats {
  id: string
  clerk_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  billing_active: boolean
  stripe_customer_id: string | null
  grace_period_end: string | null
  degraded_since: string | null
  created_at: string
  updated_at: string
  stats: {
    campaign_count: number
    scan_count: number
    last_scan: string | null
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [loading, setLoading] = useState(true)

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const fetchUsers = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "50" })
      if (searchTerm) params.set("search", searchTerm)
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      setUsers(data.users || [])
      setPagination(data.pagination)
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(1, debouncedSearch)
  }, [debouncedSearch, fetchUsers])

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, debouncedSearch)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/50 text-sm mt-1">{pagination.total} total accounts</p>
        </div>
      </div>

      {/* Search */}
      <Card variant="glass" className="p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full h-11 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm"
          />
        </div>
      </Card>

      {/* Users table */}
      <Card variant="glass" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/50 text-xs font-medium uppercase tracking-wider px-5 py-3">User</th>
                <th className="text-left text-white/50 text-xs font-medium uppercase tracking-wider px-5 py-3">Billing</th>
                <th className="text-left text-white/50 text-xs font-medium uppercase tracking-wider px-5 py-3">Campaigns</th>
                <th className="text-left text-white/50 text-xs font-medium uppercase tracking-wider px-5 py-3">Scans</th>
                <th className="text-left text-white/50 text-xs font-medium uppercase tracking-wider px-5 py-3">Last Scan</th>
                <th className="text-left text-white/50 text-xs font-medium uppercase tracking-wider px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-8 bg-white/5 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/40">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-medium shrink-0">
                          {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {user.full_name || "No name"}
                          </p>
                          <p className="text-white/40 text-xs truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {user.degraded_since ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/20 text-red-300">
                          <AlertTriangle className="h-3 w-3" /> Degraded
                        </span>
                      ) : user.billing_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/20 text-green-300">
                          <CreditCard className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-xs font-medium bg-white/10 text-white/50">
                          No sub
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-white/70 text-sm">
                        <QrCode className="h-3.5 w-3.5 text-white/30" />
                        {user.stats.campaign_count}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-white/70 text-sm">
                        <ScanLine className="h-3.5 w-3.5 text-white/30" />
                        {user.stats.scan_count.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-white/40 text-sm">
                      {user.stats.last_scan
                        ? new Date(user.stats.last_scan).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-5 py-4 text-white/40 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
            <p className="text-white/40 text-sm">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
