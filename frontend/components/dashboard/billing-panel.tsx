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
} from "lucide-react"

const PRICE_PER_SCAN_AUD = 20
const SPEND_CAP_AUD = 5000

interface BillingStatus {
  billing_active: boolean
  stripe_customer_id: string | null
  degraded: boolean
  subscription: {
    id: string
    status: string
    current_period_start: string
    current_period_end: string
    cancel_at_period_end: boolean
  } | null
  usage: {
    scan_count: number
    accrued_spend_aud: number
    spend_cap_aud: number
    price_per_scan_aud: number
  }
  upcoming_invoice: {
    amount_due: number
    currency: string
    period_end: number
  } | null
}

export function BillingPanel() {
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPortalLoading, setIsPortalLoading] = useState(false)

  useEffect(() => {
    fetchBillingStatus()
  }, [])

  const fetchBillingStatus = async () => {
    try {
      const res = await fetch("/api/billing/status")
      if (!res.ok) throw new Error("Failed to fetch billing status")
      const data = await res.json()
      setBilling(data)
    } catch (err) {
      setError("Unable to load billing information")
      console.error("Billing fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

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

  // No billing set up yet
  if (!billing?.billing_active && !billing?.stripe_customer_id) {
    return <NoBillingState />
  }

  const spendPercentage = Math.min(
    (billing.usage.accrued_spend_aud / SPEND_CAP_AUD) * 100,
    100
  )

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Billing & Usage</h2>
            <p className="text-white/60">Track your QR scan usage and manage your subscription.</p>
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
                  : `You've reached the ${formatCurrency(SPEND_CAP_AUD)} spend cap. Premium tracking features are paused until your next billing period.`}
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

      {/* Spend cap approaching warning */}
      {!billing.degraded && spendPercentage >= 70 && (
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
                You've used {formatCurrency(billing.usage.accrued_spend_aud)} of your {formatCurrency(SPEND_CAP_AUD)} monthly cap.
                {spendPercentage >= 90 && " Premium features will pause when the cap is reached."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Hero metrics — 3 column */}
      <div className="grid grid-cols-3 gap-4">
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
            ~{formatCurrency(Math.min(projectedSpend, SPEND_CAP_AUD))}
          </p>
          <p className="text-white/40 text-sm mt-1">
            ~{projectedScans.toLocaleString()} scans at current rate
          </p>
        </Card>
      </div>

      {/* Spend cap progress bar */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Spend Cap</h3>
          <p className="text-white/60 text-sm">
            {formatCurrency(billing.usage.accrued_spend_aud)} / {formatCurrency(SPEND_CAP_AUD)}
          </p>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getSpendBarColor()}`}
            style={{ width: `${spendPercentage}%` }}
          />
        </div>
        <p className="text-white/40 text-sm mt-2">
          Premium tracking features (Meta Pixel, CAPI, precision geo) pause at {formatCurrency(SPEND_CAP_AUD)}.
          QR codes continue redirecting normally.
        </p>
      </Card>

      {/* Subscription & payment details */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Subscription</h3>
              <p className="text-white/50 text-sm">Manage your plan and payment method</p>
            </div>
          </div>
          <Button
            variant="glass"
            className="h-10 px-5 bg-blue-500/20 hover:bg-blue-500/30"
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
          <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Plan</p>
              <p className="text-white/50 text-sm">Pay-per-scan metered billing</p>
            </div>
            <p className="text-white font-medium">{formatCurrency(PRICE_PER_SCAN_AUD)} / scan</p>
          </div>

          {billing.subscription && (
            <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Current Period</p>
                <p className="text-white/50 text-sm">
                  {formatDate(billing.subscription.current_period_start)} — {formatDate(billing.subscription.current_period_end)}
                </p>
              </div>
              {billing.subscription.cancel_at_period_end && (
                <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs font-medium">
                  Cancels at period end
                </span>
              )}
            </div>
          )}

          {billing.upcoming_invoice && (
            <div className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Next Invoice (preview)</p>
                <p className="text-white/50 text-sm">
                  Based on usage so far — final amount may differ
                </p>
              </div>
              <p className="text-white font-medium">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: billing.upcoming_invoice.currency.toUpperCase(),
                }).format(billing.upcoming_invoice.amount_due / 100)}
              </p>
            </div>
          )}

          <p className="text-white/40 text-sm pt-2">
            Update your payment method, download invoices, or cancel your subscription through the Stripe billing portal.
          </p>
        </div>
      </Card>

      {/* How it works */}
      <Card variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">How Billing Works</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">Pay only for what you use</p>
              <p className="text-white/50 text-sm">{formatCurrency(PRICE_PER_SCAN_AUD)} per QR code scan, billed monthly in arrears. No minimum commitment.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">Automatic spend cap at {formatCurrency(SPEND_CAP_AUD)}</p>
              <p className="text-white/50 text-sm">Premium features pause at the cap. QR codes continue working as normal redirects — your scanners are never affected.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium">Premium features included</p>
              <p className="text-white/50 text-sm">Meta Pixel & CAPI integration, suburb-level precision geolocation, and real-time scan tracking in your dashboard.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Error display */}
      {error && (
        <Card variant="glass" className="p-4 border border-red-500/30">
          <p className="text-red-300 text-sm">{error}</p>
        </Card>
      )}
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
      // For now, redirect to a setup flow
      // In production, this would use Stripe Elements for payment method collection
      const res = await fetch("/api/billing/portal", { method: "POST" })
      if (res.ok) {
        const { url } = await res.json()
        window.location.href = url
      } else {
        setSetupError("Unable to start billing setup. Please contact support.")
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
              <span className="text-white font-medium">$5,000 AUD / month</span>
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
      <Card variant="glass" className="p-6">
        <h3 className="text-xl font-semibold text-white mb-4">What's Included</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: "Meta Pixel", desc: "Client-side event tracking on every scan" },
            { title: "Conversions API", desc: "Server-side events for reliable attribution" },
            { title: "Precision Geo", desc: "Suburb-level location via BigDataCloud" },
            { title: "Real-time Dashboard", desc: "Live scan analytics and visitor tracking" },
          ].map((feature) => (
            <div key={feature.title} className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-emerald-400" />
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
