"use client"

import { useState, useEffect } from "react"
import { Card, Button } from "shared-components"
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Check,
  Loader2,
  Receipt,
  Zap,
  Shield,
  ShieldOff,
} from "lucide-react"
import { useBillingStatus } from "@/hooks/use-billing-status"

const PRICE_PER_SCAN_AUD = 20

export function BillingPanel() {
  const { billing, isLoading, error: swrError, mutate } = useBillingStatus(5000)
  const [error, setError] = useState<string | null>(null)
  const [isPortalLoading, setIsPortalLoading] = useState(false)

  // Spend cap control state — synced from billing API on load
  const [isCapEnabled, setIsCapEnabled] = useState(true)
  const [capAmount, setCapAmount] = useState(5000)
  const [capAmountInput, setCapAmountInput] = useState("5000")
  const [isCapSaving, setIsCapSaving] = useState(false)
  const [capSaveMessage, setCapSaveMessage] = useState<string | null>(null)

  // Sync local state when billing data loads or changes
  useEffect(() => {
    if (billing?.usage) {
      setIsCapEnabled(billing.usage.spend_cap_enabled)
      setCapAmount(billing.usage.spend_cap_aud)
      setCapAmountInput(String(billing.usage.spend_cap_aud))
    }
  }, [billing?.usage?.spend_cap_enabled, billing?.usage?.spend_cap_aud])

  const displayError = swrError ? "Unable to load billing information" : error

  const openStripePortal = async () => {
    setIsPortalLoading(true)
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" })
      if (!res.ok) throw new Error("Failed to create portal session")
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error("Portal error:", err)
      setError("Unable to open billing portal. Please try again.")
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsPortalLoading(false)
    }
  }

  // Toggle spend cap on/off — saves immediately via PATCH
  const handleCapToggle = async (enabled: boolean) => {
    const previousValue = isCapEnabled
    setIsCapEnabled(enabled)
    setIsCapSaving(true)
    setCapSaveMessage(null)
    try {
      const res = await fetch("/api/billing/spend-cap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spend_cap_enabled: enabled }),
      })
      if (!res.ok) {
        setIsCapEnabled(previousValue)
        setCapSaveMessage("Failed to update. Please try again.")
      } else {
        setCapSaveMessage(enabled ? "Spend cap enabled" : "Spend cap disabled")
        mutate()
      }
    } catch {
      setIsCapEnabled(previousValue)
      setCapSaveMessage("Network error. Please try again.")
    } finally {
      setIsCapSaving(false)
      setTimeout(() => setCapSaveMessage(null), 3000)
    }
  }

  // Save spend cap amount — validates then saves via PATCH
  const handleCapAmountSave = async () => {
    const amount = Number(capAmountInput)
    if (isNaN(amount) || amount < 100 || amount > 1000000) {
      setCapSaveMessage("Amount must be between $100 and $1,000,000 AUD")
      setTimeout(() => setCapSaveMessage(null), 3000)
      return
    }
    setIsCapSaving(true)
    setCapSaveMessage(null)
    try {
      const res = await fetch("/api/billing/spend-cap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spend_cap_amount_aud: amount }),
      })
      if (res.ok) {
        setCapAmount(amount)
        setCapSaveMessage("Spend cap updated")
        mutate()
      } else {
        const data = await res.json()
        setCapSaveMessage(data.error || "Failed to update")
      }
    } catch {
      setCapSaveMessage("Network error. Please try again.")
    } finally {
      setIsCapSaving(false)
      setTimeout(() => setCapSaveMessage(null), 3000)
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card variant="glass" className="p-6">
          <div className="h-8 bg-white/10 rounded-xl animate-pulse w-48 mb-2" />
          <div className="h-4 bg-white/10 rounded-xl animate-pulse w-72" />
        </Card>
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="glass" className="p-6">
            <div className="h-24 bg-white/10 rounded-xl animate-pulse" />
          </Card>
        ))}
      </div>
    )
  }

  // No billing set up yet (no Stripe customer created)
  if (!billing?.stripe_customer_id) {
    return <NoBillingState />
  }

  // Limbo state: customer exists but no active subscription
  // (user started checkout but didn't complete, or subscription was canceled)
  if (!billing.billing_active && !billing.subscription) {
    return <IncompleteSetupState />
  }

  // Use per-user cap from API (not hardcoded)
  const userCapAud = billing.usage.spend_cap_aud
  const capEnabled = billing.usage.spend_cap_enabled

  const spendPercentage = capEnabled
    ? Math.min((billing.usage.accrued_spend_aud / userCapAud) * 100, 100)
    : 0

  const getSpendBarColor = () => {
    if (spendPercentage >= 90) return "bg-red-500"
    if (spendPercentage >= 70) return "bg-yellow-500"
    return "bg-emerald-500"
  }

  const getStatusBadge = () => {
    if (!billing.subscription) return null
    const status = billing.subscription.status
    const styles: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-300",
      trialing: "bg-blue-500/20 text-blue-300",
      past_due: "bg-red-500/20 text-red-300",
      canceled: "bg-white/20 text-white/60",
      unpaid: "bg-red-500/20 text-red-300",
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {status === "active" ? "Active" :
         status === "trialing" ? "Trial" :
         status === "past_due" ? "Past Due" :
         status === "canceled" ? "Canceled" :
         status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate projected spend
  const daysInPeriod = billing.subscription
    ? Math.ceil(
        (new Date(billing.subscription.current_period_end).getTime() -
          new Date(billing.subscription.current_period_start).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 30
  const daysElapsed = billing.subscription
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - new Date(billing.subscription.current_period_start).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 1
  const dailyRate = billing.usage.scan_count / daysElapsed
  const projectedScans = Math.round(dailyRate * daysInPeriod)
  const projectedSpend = projectedScans * PRICE_PER_SCAN_AUD
  const daysRemaining = Math.max(0, daysInPeriod - daysElapsed)

  // Cap the projected spend display only when cap is enabled
  const projectedSpendDisplay = capEnabled
    ? Math.min(projectedSpend, userCapAud)
    : projectedSpend

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="glass" className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Billing & Usage</h2>
            <p className="text-white/60 text-sm md:text-base">Track your QR scan usage and manage your subscription.</p>
          </div>
          {getStatusBadge()}
        </div>
      </Card>

      {/* Degraded warning banner */}
      {billing.degraded && (
        <Card variant="glass" className="p-4 border border-red-500/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-red-300 font-medium">Premium features paused</p>
              <p className="text-red-300/70 text-sm mt-1">
                {!billing.billing_active
                  ? "Your subscription is inactive. QR codes still redirect, but Meta Pixel, CAPI, and precision geo tracking are paused."
                  : `You've reached the ${formatCurrency(userCapAud)} spend cap. Premium tracking features are paused until your next billing period.`}
              </p>
              {!billing.billing_active && (
                <Button
                  variant="glass"
                  className="mt-3 h-9 px-4 bg-red-500/20 hover:bg-red-500/30 text-sm"
                  onClick={openStripePortal}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? "Opening..." : "Reactivate Subscription"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Grace period warning */}
      {billing.grace_period?.active && (
        <Card variant="glass" className="p-4 border border-orange-500/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-orange-300 font-medium">Payment failed — grace period active</p>
              <p className="text-orange-300/70 text-sm mt-1">
                Premium features will be disabled in{" "}
                <span className="font-semibold text-orange-200">
                  {billing.grace_period.hours_remaining !== null
                    ? billing.grace_period.hours_remaining > 1
                      ? `${Math.ceil(billing.grace_period.hours_remaining)} hours`
                      : "less than 1 hour"
                    : "soon"}
                </span>
                . Update your payment method to avoid losing tracking data.
              </p>
              <Button
                variant="glass"
                className="mt-3 h-9 px-4 bg-orange-500/20 hover:bg-orange-500/30 text-sm"
                onClick={openStripePortal}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? "Opening..." : "Update Payment Method"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Missed leads counter */}
      {billing.degraded_since && billing.missed_leads_count > 0 && (
        <Card variant="glass" className="p-4 border border-red-500/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-red-300 font-medium">
                {billing.missed_leads_count} lead{billing.missed_leads_count !== 1 ? "s" : ""} missed since {formatDate(billing.degraded_since)}
              </p>
              <p className="text-red-300/70 text-sm mt-1">
                These visitors scanned your QR codes while premium tracking was disabled.
                You missed Meta Pixel events, Conversions API data, and precision geolocation for these leads.
              </p>
              <Button
                variant="glass"
                className="mt-3 h-9 px-4 bg-red-500/20 hover:bg-red-500/30 text-sm"
                onClick={openStripePortal}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? "Opening..." : "Reactivate Now"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Spend cap approaching warning — only when cap is enabled */}
      {capEnabled && !billing.degraded && spendPercentage >= 70 && (
        <Card variant="glass" className="p-4 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-yellow-300 font-medium">
                {spendPercentage >= 90 ? "Approaching spend cap" : "Usage notice"}
              </p>
              <p className="text-yellow-300/70 text-sm mt-1">
                You've used {formatCurrency(billing.usage.accrued_spend_aud)} of your {formatCurrency(userCapAud)} monthly cap.
                {spendPercentage >= 90 && " Premium features will pause when the cap is reached."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Hero metrics — compact strip on mobile, 3 cards on desktop */}
      <Card variant="glass" className="p-4 md:hidden">
        <div className="grid grid-cols-3 divide-x divide-white/10">
          <div className="px-2 first:pl-0 last:pr-0">
            <p className="text-white/50 text-xs mb-1">Scans</p>
            <p className="text-xl font-bold text-white">{billing.usage.scan_count.toLocaleString()}</p>
            <p className="text-white/40 text-xs mt-0.5">{daysRemaining}d left</p>
          </div>
          <div className="px-2">
            <p className="text-white/50 text-xs mb-1">Spend</p>
            <p className="text-xl font-bold text-white">{formatCurrency(billing.usage.accrued_spend_aud)}</p>
            <p className="text-white/40 text-xs mt-0.5">{formatCurrency(PRICE_PER_SCAN_AUD)}/scan</p>
          </div>
          <div className="px-2 last:pr-0">
            <p className="text-white/50 text-xs mb-1">Projected</p>
            <p className="text-xl font-bold text-white">~{formatCurrency(projectedSpendDisplay)}</p>
            <p className="text-white/40 text-xs mt-0.5">~{projectedScans.toLocaleString()} scans</p>
          </div>
        </div>
      </Card>

      <div className="hidden md:grid grid-cols-3 gap-4">
        <Card variant="glass" className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-white/60 text-sm">Scans This Period</p>
          </div>
          <p className="text-3xl font-bold text-white">{billing.usage.scan_count.toLocaleString()}</p>
          <p className="text-white/40 text-sm mt-1">
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
          </p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-white/60 text-sm">Current Spend</p>
          </div>
          <p className="text-3xl font-bold text-white">{formatCurrency(billing.usage.accrued_spend_aud)}</p>
          <p className="text-white/40 text-sm mt-1">
            {billing.usage.scan_count} x {formatCurrency(PRICE_PER_SCAN_AUD)}/scan
          </p>
        </Card>

        <Card variant="glass" className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-white/60 text-sm">Projected Invoice</p>
          </div>
          <p className="text-3xl font-bold text-white">
            ~{formatCurrency(projectedSpendDisplay)}
          </p>
          <p className="text-white/40 text-sm mt-1">
            ~{projectedScans.toLocaleString()} scans at current rate
          </p>
        </Card>
      </div>

      {/* Spend cap progress bar — only shown when cap is enabled */}
      {capEnabled && (
        <Card variant="glass" className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm md:text-base">Spend Cap</h3>
            <p className="text-white/60 text-xs md:text-sm">
              {formatCurrency(billing.usage.accrued_spend_aud)} / {formatCurrency(userCapAud)}
            </p>
          </div>
          <div className="w-full h-2 md:h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getSpendBarColor()}`}
              style={{ width: `${spendPercentage}%` }}
            />
          </div>
          <p className="text-white/40 text-xs md:text-sm mt-2">
            Premium features pause at {formatCurrency(userCapAud)}. QR codes continue redirecting.
          </p>
        </Card>
      )}

      {/* ============================================================
       * SPEND CAP CONTROLS
       * Two controls:
       * 1. On/off toggle — enables or disables spend cap enforcement
       * 2. Amount input — sets the dollar threshold (only when enabled)
       * ============================================================ */}
      <Card variant="glass" className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            {isCapEnabled ? (
              <Shield className="h-5 w-5 text-blue-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-white/40" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Spend Cap Controls</h3>
            <p className="text-white/50 text-xs md:text-sm">
              Control whether a monthly spend limit is enforced on your scans.
            </p>
          </div>
        </div>

        {/* Toggle: spend cap on/off */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 md:p-4 mb-3">
          <div>
            <p className="text-white font-medium text-sm md:text-base">Enforce Spend Cap</p>
            <p className="text-white/50 text-xs md:text-sm">
              {isCapEnabled
                ? "Premium features pause when spend reaches the cap"
                : "No spend limit — unlimited premium scans"}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={isCapEnabled}
            aria-label="Toggle spend cap enforcement"
            onClick={() => handleCapToggle(!isCapEnabled)}
            disabled={isCapSaving}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCapEnabled ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isCapEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Amount input: only shown when cap is enabled */}
        {isCapEnabled && (
          <div className="bg-white/5 rounded-xl p-3 md:p-4">
            <label htmlFor="cap-amount" className="text-white/80 font-medium text-sm block mb-2">
              Monthly Spend Cap (AUD)
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <input
                  id="cap-amount"
                  type="number"
                  min={100}
                  max={1000000}
                  step={100}
                  value={capAmountInput}
                  onChange={(e) => setCapAmountInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCapAmountSave()
                  }}
                  className="w-full h-10 pl-7 pr-4 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="5000"
                />
              </div>
              <Button
                variant="glass"
                className="h-10 px-5 bg-blue-500/20 hover:bg-blue-500/30 text-sm shrink-0"
                onClick={handleCapAmountSave}
                disabled={isCapSaving || capAmountInput === String(capAmount)}
              >
                {isCapSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
            <p className="text-white/40 text-xs mt-2">
              Minimum $100 AUD. Premium features pause at this amount. QR codes keep redirecting.
            </p>
          </div>
        )}

        {/* Save feedback message */}
        {capSaveMessage && (
          <p className={`text-xs mt-2 ${capSaveMessage.includes("Failed") || capSaveMessage.includes("error") || capSaveMessage.includes("must") ? "text-red-400" : "text-emerald-400"}`}>
            {capSaveMessage}
          </p>
        )}
      </Card>

      {/* Subscription & payment details */}
      <Card variant="glass" className="p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-white">Subscription</h3>
              <p className="text-white/50 text-xs md:text-sm">Manage your plan and payment method</p>
            </div>
          </div>
          <Button
            variant="glass"
            className="h-10 px-5 bg-blue-500/20 hover:bg-blue-500/30 w-full sm:w-auto"
            onClick={openStripePortal}
            disabled={isPortalLoading}
          >
            {isPortalLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Opening...
              </>
            ) : (
              <>
                Manage Billing
                <ExternalLink className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="bg-white/5 rounded-xl p-3 md:p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-medium text-sm md:text-base">Plan</p>
              <p className="text-white/50 text-xs md:text-sm">Pay-per-scan metered billing</p>
            </div>
            <p className="text-white font-medium text-sm md:text-base shrink-0">{formatCurrency(PRICE_PER_SCAN_AUD)}/scan</p>
          </div>

          {billing.subscription && (
            <div className="bg-white/5 rounded-xl p-3 md:p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-white font-medium text-sm md:text-base">Current Period</p>
                <p className="text-white/50 text-xs md:text-sm">
                  {formatDate(billing.subscription.current_period_start)} — {formatDate(billing.subscription.current_period_end)}
                </p>
              </div>
              {billing.subscription.cancel_at_period_end && (
                <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-medium w-fit">
                  Cancels at period end
                </span>
              )}
            </div>
          )}

          {billing.upcoming_invoice && (
            <div className="bg-white/5 rounded-xl p-3 md:p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-medium text-sm md:text-base">Next Invoice</p>
                <p className="text-white/50 text-xs md:text-sm">
                  Based on usage so far
                </p>
              </div>
              <p className="text-white font-medium shrink-0">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: billing.upcoming_invoice.currency.toUpperCase(),
                }).format(billing.upcoming_invoice.amount_due / 100)}
              </p>
            </div>
          )}

          <p className="text-white/40 text-xs md:text-sm pt-1">
            Update payment method, download invoices, or cancel via Stripe portal.
          </p>
        </div>
      </Card>

      {/* How it works */}
      <Card variant="glass" className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">How Billing Works</h3>
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3 w-3 md:h-4 md:w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm md:text-base">Pay only for what you use</p>
              <p className="text-white/50 text-xs md:text-sm">{formatCurrency(PRICE_PER_SCAN_AUD)} per scan, billed monthly. No minimum.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3 w-3 md:h-4 md:w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm md:text-base">
                {capEnabled
                  ? `Spend cap at ${formatCurrency(userCapAud)}`
                  : "Spend cap (configurable)"}
              </p>
              <p className="text-white/50 text-xs md:text-sm">
                {capEnabled
                  ? "Premium features pause at the cap. QR codes keep working."
                  : "Currently disabled. You can enable a spend limit in the controls above."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-3 w-3 md:h-4 md:w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm md:text-base">Premium features included</p>
              <p className="text-white/50 text-xs md:text-sm">Meta Pixel, CAPI, precision geo, and real-time tracking.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Error display */}
      {displayError && (
        <Card variant="glass" className="p-4 border border-red-500/30">
          <p className="text-red-300 text-sm">{displayError}</p>
        </Card>
      )}
    </div>
  )
}

/** Shown when user created a Stripe customer but never completed checkout */
function IncompleteSetupState() {
  const [isSetupLoading, setIsSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const handleSetup = async () => {
    setIsSetupLoading(true)
    setSetupError(null)

    try {
      const res = await fetch("/api/billing/setup", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        setSetupError(data.error || "Unable to start billing setup. Please contact support.")
      }
    } catch {
      setSetupError("Something went wrong. Please try again.")
    } finally {
      setIsSetupLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Billing & Usage</h2>
        <p className="text-white/60">Complete your billing setup to activate premium features.</p>
      </Card>

      <Card variant="glass" className="p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">Setup Incomplete</h3>
          <p className="text-white/60 mb-6 leading-relaxed">
            Your billing account was created, but the subscription wasn't activated.
            Click below to complete the checkout process — you'll only be charged for actual QR scans.
          </p>

          <Button
            variant="glass"
            className="h-12 px-8 bg-blue-500/30 hover:bg-blue-500/40 text-white font-medium"
            onClick={handleSetup}
            disabled={isSetupLoading}
          >
            {isSetupLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Opening Checkout...
              </>
            ) : (
              "Complete Billing Setup"
            )}
          </Button>

          {setupError && (
            <p className="text-red-400 text-sm mt-3">{setupError}</p>
          )}

          <p className="text-white/40 text-xs mt-4">
            Metered billing — $20 AUD per scan, billed monthly. No upfront charge.
          </p>
        </div>
      </Card>
    </div>
  )
}

/** Shown when user has no billing set up yet */
function NoBillingState() {
  const [isSetupLoading, setIsSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const handleSetup = async () => {
    setIsSetupLoading(true)
    setSetupError(null)

    try {
      const res = await fetch("/api/billing/setup", { method: "POST" })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        setSetupError(data.error || "Unable to start billing setup. Please contact support.")
      }
    } catch {
      setSetupError("Something went wrong. Please try again.")
    } finally {
      setIsSetupLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card variant="glass" className="p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Billing & Usage</h2>
        <p className="text-white/60">Set up billing to unlock premium tracking features.</p>
      </Card>

      <Card variant="glass" className="p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <CreditCard className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3">Get Started with Billing</h3>
          <p className="text-white/60 mb-6 leading-relaxed">
            Activate metered billing to enable Meta Pixel integration, Conversions API tracking,
            and suburb-level precision geolocation for your QR code scans.
          </p>

          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">Price per scan</span>
              <span className="text-white font-medium">$20 AUD</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">Billing cycle</span>
              <span className="text-white font-medium">Monthly in arrears</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">Spend cap</span>
              <span className="text-white font-medium">$5,000 AUD / month (adjustable)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">Minimum</span>
              <span className="text-white font-medium">No minimum</span>
            </div>
          </div>

          <Button
            variant="glass"
            className="h-12 px-8 bg-blue-500/30 hover:bg-blue-500/40 text-white font-medium"
            onClick={handleSetup}
            disabled={isSetupLoading}
          >
            {isSetupLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Setting up...
              </>
            ) : (
              "Set Up Billing"
            )}
          </Button>

          {setupError && (
            <p className="text-red-400 text-sm mt-3">{setupError}</p>
          )}

          <p className="text-white/40 text-xs mt-4">
            Powered by Stripe. Your payment details are never stored on our servers.
          </p>
        </div>
      </Card>

      {/* What you get */}
      <Card variant="glass" className="p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4">What's Included</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {[
            { title: "Meta Pixel", desc: "Client-side event tracking on every scan" },
            { title: "Conversions API", desc: "Server-side events for reliable attribution" },
            { title: "Precision Geo", desc: "Suburb-level location via BigDataCloud" },
            { title: "Real-time Dashboard", desc: "Live scan analytics and visitor tracking" },
          ].map((feature) => (
            <div key={feature.title} className="bg-white/5 rounded-xl p-3 md:p-4">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-white font-medium text-sm">{feature.title}</p>
              </div>
              <p className="text-white/50 text-xs">{feature.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
