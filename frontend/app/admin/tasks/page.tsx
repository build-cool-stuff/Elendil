"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, Button } from "shared-components"
import {
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  GripVertical,
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

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tasks")
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (err) {
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
      if (res.ok) {
        setNewTitle("")
        setNewDescription("")
        setNewPriority("medium")
        setNewDueDate("")
        setShowForm(false)
        fetchTasks()
      }
    } catch (err) {
      console.error("Failed to create task:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const updateTask = async (id: string, updates: Record<string, unknown>) => {
    try {
      await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      fetchTasks()
    } catch (err) {
      console.error("Failed to update task:", err)
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
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
        <div>
          <h1 className="text-2xl font-bold text-white">Dev Tasks</h1>
          <p className="text-white/50 text-sm mt-1">
            {todoCount} to do, {inProgressCount} in progress, {doneCount} done
          </p>
        </div>
        <Button
          variant="glass"
          className="h-10 px-4 bg-blue-500/20 hover:bg-blue-500/30"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card variant="glass" className="p-6">
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
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
                  className="h-8 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="glass"
                className="h-10 px-6 bg-blue-500/20 hover:bg-blue-500/30"
                onClick={createTask}
                disabled={isCreating || !newTitle.trim()}
              >
                {isCreating ? "Creating..." : "Create Task"}
              </Button>
              <Button variant="glass" className="h-10 px-6" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filter tabs */}
      <Card variant="glass" className="p-3">
        <div className="flex gap-1.5">
          {[
            { value: "all", label: `All (${tasks.length})` },
            { value: "todo", label: `To Do (${todoCount})` },
            { value: "in_progress", label: `In Progress (${inProgressCount})` },
            { value: "done", label: `Done (${doneCount})` },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
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
          <Card variant="glass" className="p-12 text-center">
            <p className="text-white/40">No tasks found</p>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const config = statusConfig[task.status] || statusConfig.todo
            const StatusIcon = config.icon
            return (
              <Card key={task.id} variant="glass" className="p-4 group">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => updateTask(task.id, { status: cycleStatus(task.status) })}
                    className={`mt-0.5 shrink-0 ${config.color} hover:text-white transition-colors`}
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
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityBadge[task.priority] || ""}`}>
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
                    className="text-white/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
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
