import useSWR from "swr"

export interface BillingStatus {
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
    spend_cap_enabled: boolean
    price_per_scan_aud: number
  }
  upcoming_invoice: {
    amount_due: number
    currency: string
    period_end: number
  } | null
  grace_period: {
    active: boolean
    ends_at: string
    hours_remaining: number | null
  } | null
  degraded_since: string | null
  missed_leads_count: number
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch billing status")
    return res.json() as Promise<BillingStatus>
  })

export function useBillingStatus(refreshInterval = 30000) {
  const { data, error, isLoading, mutate } = useSWR<BillingStatus>(
    "/api/billing/status",
    fetcher,
    {
      refreshInterval,
      dedupingInterval: 4000,
      revalidateOnFocus: false,
    }
  )

  return {
    billing: data ?? null,
    isLoading,
    error,
    mutate,
  }
}
