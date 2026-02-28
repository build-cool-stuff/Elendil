import { Suspense } from "react"
import { CRMDashboard } from "@/components/dashboard/crm-dashboard"

export default function DashboardPage() {
  return (
    <Suspense>
      <CRMDashboard />
    </Suspense>
  )
}
