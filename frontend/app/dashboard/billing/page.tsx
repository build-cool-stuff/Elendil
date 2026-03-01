"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { BillingPanel } from "@/components/dashboard/billing-panel"

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [billingKey, setBillingKey] = useState(0)

  // Handle ?billing=success or ?billing=canceled from Stripe redirect
  useEffect(() => {
    const billingParam = searchParams.get("billing")
    if (!billingParam) return

    if (billingParam === "success") {
      setBillingKey((k) => k + 1) // Force billing panel to re-fetch
      toast.success("Billing setup complete! Your subscription is now active.")
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
