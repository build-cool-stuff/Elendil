"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, Button } from "shared-components"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
} from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string | null
  created_at: string
  updated_at: string
}

const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: "To Do", icon: Circle, color: "text-white/40" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-400" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-400" },
}

const priorityBadge: Record<string, string> = {
  high: "bg-red-500/20 text-red-300",
  medium: "bg-yellow-500/20 text-yellow-300",
  low: "bg-green-500/20 text-green-300",
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newPriority, setNewPriority] = useState("medium")
  const [newDueDate, setNewDueDate] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tasks")
      if (!res.ok) throw new Error("Failed to load tasks")
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (err) {
      toast.error("Failed to load tasks")
      console.error("Failed to fetch tasks:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const createTask = async () => {
    if (!newTitle.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          priority: newPriority,
          due_date: newDueDate || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to create task")
      setNewTitle("")
      setNewDescription("")
      setNewPriority("medium")
      setNewDueDate("")
      setShowForm(false)
      fetchTasks()
      toast.success("Task created")
    } catch (err) {
      toast.error("Failed to create task")
      console.error("Failed to create task:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const updateTask = async (id: string, updates: Record<string, unknown>) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    )
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        fetchTasks()
        toast.error("Failed to update task")
      }
    } catch (err) {
      fetchTasks()
      toast.error("Failed to update task")
      console.error("Failed to update task:", err)
    }
  }

  const deleteTask = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete task")
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => t.id !== id))
        setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      }, 200)
      toast.success("Task deleted")
    } catch (err) {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      toast.error("Failed to delete task")
      console.error("Failed to delete task:", err)
    }
  }

  const cycleStatus = (current: string): string => {
    const order = ["todo", "in_progress", "done"]
    const idx = order.indexOf(current)
    return order[(idx + 1) % order.length]
  }

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)

  const todoCount = tasks.filter((t) => t.status === "todo").length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const doneCount = tasks.filter((t) => t.status === "done").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <ListTodo className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dev Tasks</h1>
            <p className="text-white/50 text-sm mt-1">
              {todoCount} to do, {inProgressCount} in progress, {doneCount} done
            </p>
          </div>
        </div>
        <Button
          variant="glass"
          className="h-11 px-4 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 transition-all"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">New Task</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Create form */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          showForm ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <Card variant="glass" className="p-4 sm:p-6 mb-0">
            <h3 className="text-lg font-semibold text-white mb-4">New Task</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title"
                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-none text-sm"
              />
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-white/40 text-xs font-medium block mb-1.5">Priority</label>
                  <div className="flex gap-1.5">
                    {["low", "medium", "high"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewPriority(p)}
                        className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] capitalize ${
                          newPriority === p ? priorityBadge[p] : "bg-white/5 text-white/40 hover:bg-white/10"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white/40 text-xs font-medium block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="glass"
                  className="h-11 px-6 bg-blue-500/20 hover:bg-blue-500/30 active:scale-95 transition-all flex-1 sm:flex-none"
                  onClick={createTask}
                  disabled={isCreating || !newTitle.trim()}
                >
                  {isCreating ? "Creating..." : "Create Task"}
                </Button>
                <Button variant="glass" className="h-11 px-6 active:scale-95 transition-all flex-1 sm:flex-none" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Filter tabs */}
      <Card variant="glass" className="p-4">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { value: "all", label: `All (${tasks.length})` },
            { value: "todo", label: `To Do (${todoCount})` },
            { value: "in_progress", label: `In Progress (${inProgressCount})` },
            { value: "done", label: `Done (${doneCount})` },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px] whitespace-nowrap ${
                filter === f.value
                  ? "bg-white/15 text-white scale-[1.02]"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5 scale-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Task list */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="glass" className="p-4">
              <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
            </Card>
          ))
        ) : filteredTasks.length === 0 ? (
          <Card variant="glass" className="p-12 sm:p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ListTodo className="h-8 w-8 text-white/30" />
            </div>
            <p className="text-white/50 font-medium">No tasks found</p>
            <p className="text-white/30 text-sm mt-1">Create a task to get started</p>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const config = statusConfig[task.status] || statusConfig.todo
            const StatusIcon = config.icon
            return (
              <Card
                key={task.id}
                variant="glass"
                className={`p-4 group transition-all duration-200 ${
                  deletingIds.has(task.id) ? "opacity-0 scale-95 -translate-y-1" : "opacity-100 scale-100"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => updateTask(task.id, { status: cycleStatus(task.status) })}
                    className={`shrink-0 ${config.color} hover:text-white active:text-white transition-colors w-11 h-11 flex items-center justify-center rounded-lg -ml-1`}
                    title={`Click to change status (currently: ${config.label})`}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "done" ? "text-white/40 line-through" : "text-white"}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-white/30 text-xs mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${priorityBadge[task.priority] || ""}`}>
                        {task.priority}
                      </span>
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-white/30 text-xs">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-white/20 hover:text-red-400 active:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100 shrink-0 w-11 h-11 flex items-center justify-center rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
