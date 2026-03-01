import { Card } from "shared-components"
import { MapPin } from "lucide-react"

export default function MapPage() {
  return (
    <Card variant="glass" className="p-6">
      <div className="text-center py-16">
        <MapPin className="w-16 h-16 text-white/40 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Heat Map</h2>
        <p className="text-white/60 max-w-md mx-auto">
          Visualize where your QR codes are being scanned with an interactive heat map.
          This feature will show scan locations by suburb.
        </p>
        <span className="inline-block mt-4 bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium">
          Coming Soon
        </span>
      </div>
    </Card>
  )
}
