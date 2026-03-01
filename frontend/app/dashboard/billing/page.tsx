import { Suspense } from "react"
import { BillingPageClient } from "./billing-page-client"

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageClient />
    </Suspense>
  )
}
