"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { BillingPanel } from "@/components/dashboard/billing-panel"

export function BillingPageClient() {
  const searchParams = useSearchParams()
  const [billingKey, setBillingKey] = useState(0)
  const handledRef = useRef(false)

  // Handle ?billing=success or ?billing=canceled from Stripe redirect
  // Only show the success toast once per page load to prevent spoofing via URL manipulation
  useEffect(() => {
    if (handledRef.current) return
    const billingParam = searchParams.get("billing")
    if (!billingParam) return

    handledRef.current = true

    if (billingParam === "success") {
      setBillingKey((k) => k + 1) // Force billing panel to re-fetch
      toast.success("Billing setup complete! Verifying subscription status...")
    } else if (billingParam === "canceled") {
      toast.info("Billing setup was canceled. You can try again anytime.")
    }

    // Clear the query param from the URL
    const url = new URL(window.location.href)
    url.searchParams.delete("billing")
    window.history.replaceState({}, "", url.pathname)
  }, [searchParams])

  return <BillingPanel key={billingKey} />
}
