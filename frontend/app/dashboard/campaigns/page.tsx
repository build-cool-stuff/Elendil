import { Card } from "shared-components"
import { Facebook } from "lucide-react"

export default function CampaignsPage() {
  return (
    <Card variant="glass" className="p-6">
      <div className="text-center py-16">
        <Facebook className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Meta Campaigns</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Connect your Meta (Facebook/Instagram) ad account to track attribution
          between QR code scans and ad conversions.
        </p>
        <span className="inline-block mt-4 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium">
          Coming Soon
        </span>
      </div>
    </Card>
  )
}
