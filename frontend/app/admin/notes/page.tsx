"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, Button } from "shared-components"
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  Save,
  StickyNote,
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notes")
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (err) {
      console.error("Failed to fetch notes:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const createNote = async () => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Note", content: "" }),
      })
      if (res.ok) {
        const note = await res.json()
        setNotes((prev) => [note, ...prev])
        startEditing(note)
      }
    } catch (err) {
      console.error("Failed to create note:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const startEditing = (note: Note) => {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
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
      if (res.ok) {
        const updated = await res.json()
        setNotes((prev) => prev.map((n) => (n.id === editingId ? updated : n)))
        setEditingId(null)
      }
    } catch (err) {
      console.error("Failed to save note:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const togglePin = async (note: Note) => {
    try {
      const res = await fetch(`/api/admin/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      })
      if (res.ok) {
        fetchNotes()
      }
    } catch (err) {
      console.error("Failed to toggle pin:", err)
    }
  }

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/admin/notes/${id}`, { method: "DELETE" })
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (editingId === id) setEditingId(null)
    } catch (err) {
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
          className="h-10 px-4 bg-blue-500/20 hover:bg-blue-500/30"
          onClick={createNote}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </div>

      {/* Editor */}
      {editingId && (
        <Card variant="glass" className="p-6 border-blue-500/20">
          <div className="space-y-4">
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
              rows={10}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-y text-sm leading-relaxed font-mono"
            />
            <div className="flex gap-2">
              <Button
                variant="glass"
                className="h-10 px-6 bg-blue-500/20 hover:bg-blue-500/30"
                onClick={saveNote}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button variant="glass" className="h-10 px-6" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notes grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-5">
              <div className="h-24 bg-white/5 rounded-lg animate-pulse" />
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card variant="glass" className="p-12 text-center">
          <StickyNote className="h-10 w-10 mx-auto mb-3 text-white/20" />
          <p className="text-white/40">No notes yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              variant="glass"
              className={`p-5 group cursor-pointer hover:bg-white/[0.08] transition-colors ${
                note.pinned ? "border-yellow-500/20" : ""
              } ${editingId === note.id ? "ring-2 ring-blue-500/50" : ""}`}
              onClick={() => {
                if (editingId !== note.id) startEditing(note)
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {note.pinned && <Pin className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
                  <h3 className="text-white font-medium text-sm truncate">
                    {note.title || "Untitled"}
                  </h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(note) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-yellow-400 hover:bg-white/10 transition-colors"
                    title={note.pinned ? "Unpin" : "Pin"}
                  >
                    {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
