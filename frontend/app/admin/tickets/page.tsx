"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, Button } from "shared-components"
import {
  TicketCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface Ticket {
  id: string
  user_id: string
  subject: string
  message: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  users: {
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

const statusFilters = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
]

const statusIcons: Record<string, typeof Clock> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  closed: XCircle,
}

const statusColors: Record<string, string> = {
  open: "bg-yellow-500/20 text-yellow-300",
  in_progress: "bg-blue-500/20 text-blue-300",
  resolved: "bg-green-500/20 text-green-300",
  closed: "bg-white/10 text-white/40",
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-300",
  medium: "bg-yellow-500/20 text-yellow-300",
  low: "bg-green-500/20 text-green-300",
}

export default function AdminTicketsPage() {
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" })
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/admin/tickets?${params}`)
      const data = await res.json()
      setTickets(data.tickets || [])
      setTotalPages(data.pagination?.pages || 0)
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      console.error("Failed to fetch tickets:", err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
        <p className="text-white/50 text-sm mt-1">{total} total tickets</p>
      </div>

      {/* Filters */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tickets list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-5">
              <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
            </Card>
          ))
        ) : tickets.length === 0 ? (
          <Card variant="glass" className="p-12">
            <div className="text-center text-white/40">
              <TicketCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No tickets found</p>
            </div>
          </Card>
        ) : (
          tickets.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status] || AlertCircle
            return (
              <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
                <Card variant="glass" className="p-5 hover:bg-white/[0.08] transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className={`h-4 w-4 shrink-0 ${statusColors[ticket.status]?.split(" ")[1] || "text-white/40"}`} />
                        <h3 className="text-white font-medium truncate">{ticket.subject}</h3>
                      </div>
                      <p className="text-white/40 text-sm line-clamp-1">{ticket.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <p className="text-white/30 text-xs">
                          {ticket.users.full_name || ticket.users.email}
                        </p>
                        <p className="text-white/20 text-xs">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${priorityColors[ticket.priority] || ""}`}>
                        {ticket.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[ticket.status] || ""}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-white/40 text-sm">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="glass" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="glass" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
