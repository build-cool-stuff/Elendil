import { Suspense } from "react"
import { QRCodePage } from "./qr-code-page"

// Default /dashboard route shows the QR Code tab
export default function DashboardPage() {
  return (
    <Suspense>
      <QRCodePage />
    </Suspense>
  )
}
