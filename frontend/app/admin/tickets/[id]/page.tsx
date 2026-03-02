"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { Card, Button } from "shared-components"
import { toast } from "sonner"
import {
  ArrowLeft,
  Send,
  User,
  Shield,
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

interface Reply {
  id: string
  ticket_id: string
  author_type: string
  author_id: string | null
  message: string
  created_at: string
}

const statusOptions = ["open", "in_progress", "resolved", "closed"]
const priorityOptions = ["low", "medium", "high"]

const statusColors: Record<string, string> = {
  open: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  resolved: "bg-green-500/20 text-green-300 border-green-500/30",
  closed: "bg-white/10 text-white/40 border-white/10",
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-300 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-green-500/20 text-green-300 border-green-500/30",
}

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyMessage, setReplyMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newReplyId, setNewReplyId] = useState<string | null>(null)

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`)
      if (!res.ok) throw new Error("Failed to load ticket")
      const data = await res.json()
      setTicket(data.ticket)
      setReplies(data.replies || [])
    } catch (err) {
      toast.error("Failed to load ticket")
      console.error("Failed to fetch ticket:", err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  const updateTicket = async (field: string, value: string) => {
    const previousTicket = ticket
    // Optimistic
    setTicket((prev) => prev ? { ...prev, [field]: value } : prev)
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) {
        setTicket(previousTicket)
        toast.error("Failed to update ticket")
      }
    } catch (err) {
      setTicket(previousTicket)
      toast.error("Failed to update ticket")
      console.error("Failed to update ticket:", err)
    }
  }

  const sendReply = async () => {
    if (!replyMessage.trim()) return
    setIsSending(true)
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage.trim() }),
      })
      if (!res.ok) throw new Error("Failed to send reply")
      const data = await res.json()
      setReplies((prev) => [...prev, data])
      setReplyMessage("")
      setNewReplyId(data.id)
      setTimeout(() => setNewReplyId(null), 500)
      setTimeout(() => {
        document.getElementById(`reply-${data.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 50)
      toast.success("Reply sent")
    } catch (err) {
      toast.error("Failed to send reply")
      console.error("Failed to send reply:", err)
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card variant="glass" className="p-6">
          <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
        </Card>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <Card variant="glass" className="p-12 text-center">
          <p className="text-white/40 mb-4">Ticket not found</p>
          <Link href="/admin/tickets">
            <Button variant="glass" className="active:scale-95 transition-all">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/tickets">
          <Button variant="glass" size="icon" className="min-w-[44px] min-h-[44px] active:scale-95 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{ticket.subject}</h1>
          <p className="text-white/40 text-sm truncate">
            From {ticket.users.full_name || ticket.users.email} &middot; {new Date(ticket.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Status & priority controls */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4">
          <div>
            <label className="text-white/40 text-xs font-medium block mb-1.5">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => updateTicket("status", s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize border min-h-[40px] active:scale-95 ${
                    ticket.status === s
                      ? statusColors[s]
                      : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-white/40 text-xs font-medium block mb-1.5">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {priorityOptions.map((p) => (
                <button
                  key={p}
                  onClick={() => updateTicket("priority", p)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize border min-h-[40px] active:scale-95 ${
                    ticket.priority === p
                      ? priorityColors[p]
                      : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:ml-auto">
            <label className="text-white/40 text-xs font-medium block mb-1.5">Contact</label>
            <a
              href={`mailto:${ticket.users.email}`}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              {ticket.users.email}
            </a>
          </div>
        </div>
      </Card>

      {/* Original message */}
      <Card variant="glass" className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-purple-300" />
          </div>
          <span className="text-white/60 text-sm font-medium">
            {ticket.users.full_name || ticket.users.email}
          </span>
          <span className="text-white/20 text-xs">
            {new Date(ticket.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
      </Card>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-3">
          {replies.map((reply) => (
            <Card
              key={reply.id}
              id={`reply-${reply.id}`}
              variant="glass"
              className={`p-4 sm:p-5 transition-all duration-300 ${
                reply.author_type === "admin" ? "ml-2 sm:ml-6 border-l-2 border-blue-500/30" : ""
              } ${newReplyId === reply.id ? "admin-fade-in" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  reply.author_type === "admin" ? "bg-blue-500/20" : "bg-purple-500/20"
                }`}>
                  {reply.author_type === "admin"
                    ? <Shield className="h-3 w-3 text-blue-300" />
                    : <User className="h-3 w-3 text-purple-300" />
                  }
                </div>
                <span className="text-white/60 text-sm font-medium">
                  {reply.author_type === "admin" ? "Admin" : ticket.users.full_name || ticket.users.email}
                </span>
                <span className="text-white/20 text-xs">
                  {new Date(reply.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">{reply.message}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Reply form */}
      <Card variant="glass" className="p-4 sm:p-5">
        <label className="text-white/60 text-sm font-medium block mb-2">Reply as Admin</label>
        <textarea
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="Type your reply..."
          rows={4}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-none text-sm"
        />
        <div className="flex justify-end mt-3">
          <Button
            variant="glass"
            className="h-11 px-6 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 transition-all"
            onClick={sendReply}
            disabled={isSending || !replyMessage.trim()}
          >
            {isSending ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Reply
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
