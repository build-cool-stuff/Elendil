"use client"

import { Card, Button } from "shared-components"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card variant="glass" className="p-6">
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-white/60 mb-6 max-w-md mx-auto text-sm">
          {error.message || "An unexpected error occurred in the admin panel."}
        </p>
        <Button
          variant="glass"
          className="h-11 px-6 active:scale-95 transition-all"
          onClick={reset}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    </Card>
  )
}
