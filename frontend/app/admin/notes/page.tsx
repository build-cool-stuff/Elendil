"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, Button } from "shared-components"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  Save,
  StickyNote,
  AlertCircle,
  MoreVertical,
  X,
} from "lucide-react"

interface Note {
  id: string
  title: string
  content: string
  pinned: boolean
  created_at: string
  updated_at: string
}

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    setFetchError(null)
    try {
      const res = await fetch("/api/admin/notes")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load notes (${res.status})`)
      }
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notes"
      setFetchError(message)
      console.error("Failed to fetch notes:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Close menu when tapping outside
  useEffect(() => {
    if (!openMenuId) return
    const handleTap = () => setOpenMenuId(null)
    document.addEventListener("click", handleTap)
    return () => document.removeEventListener("click", handleTap)
  }, [openMenuId])

  const createNote = async () => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Note", content: "" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to create note (${res.status})`)
      }
      const note = await res.json()
      setNotes((prev) => [note, ...prev])
      startEditing(note)
      toast.success("Note created")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create note"
      toast.error(message)
      console.error("Failed to create note:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const startEditing = (note: Note) => {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setOpenMenuId(null)
  }

  const saveNote = async () => {
    if (!editingId) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/notes/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to save note (${res.status})`)
      }
      const updated = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === editingId ? updated : n)))
      setEditingId(null)
      toast.success("Note saved")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save note"
      toast.error(message)
      console.error("Failed to save note:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const togglePin = async (note: Note) => {
    // Optimistic update
    const previousNotes = [...notes]
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n))
    )
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/admin/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      })
      if (!res.ok) {
        throw new Error("Failed to update pin")
      }
      // Re-fetch to get correct sort order (pinned first)
      fetchNotes()
    } catch (err) {
      setNotes(previousNotes)
      toast.error("Failed to pin/unpin note")
      console.error("Failed to toggle pin:", err)
    }
  }

  const deleteNote = async (id: string) => {
    // Optimistic update
    const previousNotes = [...notes]
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (editingId === id) setEditingId(null)
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/admin/notes/${id}`, { method: "DELETE" })
      if (!res.ok) {
        throw new Error("Failed to delete note")
      }
      toast.success("Note deleted")
    } catch (err) {
      setNotes(previousNotes)
      toast.error("Failed to delete note")
      console.error("Failed to delete note:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notes</h1>
          <p className="text-white/50 text-sm mt-1">Personal notes and reminders</p>
        </div>
        <Button
          variant="glass"
          className="h-10 px-4 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 transition-all"
          onClick={createNote}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? "Creating..." : "New Note"}
        </Button>
      </div>

      {/* Error banner */}
      {fetchError && (
        <Card variant="glass" className="p-4 border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-red-300 text-sm font-medium">Failed to load notes</p>
              <p className="text-red-300/60 text-xs mt-0.5 truncate">{fetchError}</p>
            </div>
            <Button
              variant="glass"
              size="sm"
              className="shrink-0"
              onClick={() => { setLoading(true); fetchNotes() }}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Editor */}
      {editingId && (
        <Card variant="glass" className="p-4 sm:p-6 border-blue-500/20">
          <div className="space-y-3 sm:space-y-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Note title"
              className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm font-medium"
              autoFocus
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write your note..."
              rows={6}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-y text-sm leading-relaxed font-mono min-h-[120px]"
            />
            <div className="flex gap-2">
              <Button
                variant="glass"
                className="h-10 px-4 sm:px-6 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 transition-all flex-1 sm:flex-none"
                onClick={saveNote}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="glass"
                className="h-10 px-4 sm:px-6 active:scale-95 transition-all flex-1 sm:flex-none"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-5">
              <div className="h-24 bg-white/5 rounded-lg animate-pulse" />
            </Card>
          ))}
        </div>
      ) : notes.length === 0 && !fetchError ? (
        <Card variant="glass" className="p-12 text-center">
          <StickyNote className="h-10 w-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">No notes yet</p>
          <p className="text-white/25 text-xs mt-1">Tap &ldquo;New Note&rdquo; to get started</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              variant="glass"
              className={`p-4 sm:p-5 group cursor-pointer hover:bg-white/[0.08] active:bg-white/[0.06] transition-all ${
                note.pinned ? "border-yellow-500/20" : ""
              } ${editingId === note.id ? "ring-2 ring-blue-500/50" : ""}`}
              onClick={() => {
                if (editingId !== note.id && openMenuId !== note.id) startEditing(note)
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {note.pinned && <Pin className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
                  <h3 className="text-white font-medium text-sm truncate">
                    {note.title || "Untitled"}
                  </h3>
                </div>
                {/* Desktop: hover actions */}
                <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(note) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-yellow-400 hover:bg-white/10 transition-colors"
                    title={note.pinned ? "Unpin" : "Pin"}
                  >
                    {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Mobile: three-dot menu */}
                <div className="sm:hidden relative shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === note.id ? null : note.id)
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 active:bg-white/10 transition-colors"
                  >
                    {openMenuId === note.id ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </button>
                  {openMenuId === note.id && (
                    <div className="absolute right-0 top-9 z-20 w-36 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(note) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 active:bg-white/15 transition-colors"
                      >
                        {note.pinned ? <PinOff className="h-3.5 w-3.5 text-yellow-400" /> : <Pin className="h-3.5 w-3.5 text-yellow-400" />}
                        {note.pinned ? "Unpin" : "Pin note"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditing(note) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 active:bg-white/15 transition-colors"
                      >
                        <Save className="h-3.5 w-3.5 text-blue-400" />
                        Edit note
                      </button>
                      <div className="border-t border-white/10" />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-white/30 text-xs line-clamp-4 whitespace-pre-wrap">
                {note.content || "Empty note"}
              </p>
              <p className="text-white/15 text-xs mt-3">
                {new Date(note.updated_at).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
