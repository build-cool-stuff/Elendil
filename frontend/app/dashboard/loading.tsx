import { Card } from "shared-components"

export default function DashboardLoading() {
  return (
    <Card variant="glass" className="p-6">
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-white/10 rounded-xl w-48" />
        <div className="h-4 bg-white/10 rounded-xl w-72" />
        <div className="h-32 bg-white/10 rounded-2xl mt-6" />
      </div>
    </Card>
  )
}
