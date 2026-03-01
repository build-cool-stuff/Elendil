"use client"

import { useState, useEffect } from "react"
import { Card, Button } from "shared-components"
import { AlertTriangle, X } from "lucide-react"
import { useBillingStatus } from "@/hooks/use-billing-status"

const WARNING_THRESHOLDS = [5, 3, 1] as const

function getDismissKey(periodEnd: string, threshold: number) {
  return `billing_warning_dismissed_${periodEnd}_${threshold}`
}

export function BillingWarnings() {
  const { billing: data } = useBillingStatus(30000)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Load dismissed state from localStorage
  useEffect(() => {
    if (!data?.subscription?.current_period_end) return
    const periodEnd = data.subscription.current_period_end
    const dismissedKeys = new Set<string>()
    for (const t of WARNING_THRESHOLDS) {
      const key = getDismissKey(periodEnd, t)
      if (localStorage.getItem(key)) dismissedKeys.add(key)
    }
    setDismissed(dismissedKeys)
  }, [data?.subscription?.current_period_end])

  if (!data || !data.subscription) return null

  const periodEnd = new Date(data.subscription.current_period_end)
  const now = new Date()
  const daysUntilEnd = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const dismiss = (threshold: number) => {
    const key = getDismissKey(data.subscription!.current_period_end, threshold)
    localStorage.setItem(key, "1")
    setDismissed((prev) => new Set(prev).add(key))
  }

  // Grace period warning — highest priority, cannot be dismissed
  if (data.grace_period?.active) {
    const hoursLeft = data.grace_period.hours_remaining
    return (
      <Card variant="glass" className="p-3 md:p-4 border border-red-500/40 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-red-300 font-medium text-sm">
              Payment failed — {hoursLeft != null
                ? (hoursLeft > 1 ? `${Math.ceil(hoursLeft)} hours` : "less than 1 hour")
                : "soon"} until premium features are disabled
            </p>
          </div>
          <Button
            variant="glass"
            className="h-8 px-3 bg-red-500/20 hover:bg-red-500/30 text-xs shrink-0"
            onClick={async () => {
              const res = await fetch("/api/billing/portal", { method: "POST" })
              if (res.ok) {
                const { url } = await res.json()
                window.location.href = url
              }
            }}
          >
            Update Payment
          </Button>
        </div>
      </Card>
    )
  }

  // Degraded warning — shown when premium is off, cannot be dismissed
  if (data.degraded && data.degraded_since) {
    return (
      <Card variant="glass" className="p-3 md:p-4 border border-red-500/30 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-red-300 text-sm flex-1">
            Premium tracking is disabled.
            {data.missed_leads_count > 0 && (
              <span className="font-semibold"> {data.missed_leads_count} lead{data.missed_leads_count !== 1 ? "s" : ""} missed.</span>
            )}
          </p>
          <Button
            variant="glass"
            className="h-8 px-3 bg-red-500/20 hover:bg-red-500/30 text-xs shrink-0"
            onClick={async () => {
              const res = await fetch("/api/billing/portal", { method: "POST" })
              if (res.ok) {
                const { url } = await res.json()
                window.location.href = url
              }
            }}
          >
            Reactivate
          </Button>
        </div>
      </Card>
    )
  }

  // Pre-payment warnings (5, 3, 1 day) — only for active subscriptions
  if (!data.billing_active || data.subscription.status !== "active") return null

  // Find the active warning threshold
  const activeThreshold = WARNING_THRESHOLDS.find((t) => daysUntilEnd <= t)
  if (!activeThreshold) return null

  const dismissKey = getDismissKey(data.subscription.current_period_end, activeThreshold)
  if (dismissed.has(dismissKey)) return null

  const colors = {
    5: { border: "border-yellow-500/30", bg: "bg-yellow-500/20", text: "text-yellow-300", icon: "text-yellow-400" },
    3: { border: "border-orange-500/30", bg: "bg-orange-500/20", text: "text-orange-300", icon: "text-orange-400" },
    1: { border: "border-red-500/30", bg: "bg-red-500/20", text: "text-red-300", icon: "text-red-400" },
  }
  const c = colors[activeThreshold]

  return (
    <Card variant="glass" className={`p-3 md:p-4 ${c.border} mb-4`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
          <AlertTriangle className={`h-4 w-4 ${c.icon}`} />
        </div>
        <p className={`${c.text} text-sm flex-1`}>
          {daysUntilEnd <= 1
            ? "Your invoice is due tomorrow. Ensure your payment method is up to date."
            : `Your billing period ends in ${daysUntilEnd} days. Your card will be charged for this period's usage.`}
        </p>
        <button
          onClick={() => dismiss(activeThreshold)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 shrink-0"
        >
          <X className="h-3.5 w-3.5 text-white/40" />
        </button>
      </div>
    </Card>
  )
}
