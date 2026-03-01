"use client"

import { QRCodeGenerator } from "@/components/dashboard/qr-code-generator"
import { useCampaigns } from "@/hooks/use-campaigns"

export function QRCodePage() {
  const { campaigns, isLoading, mutate } = useCampaigns()

  return <QRCodeGenerator campaigns={campaigns} isLoading={isLoading} mutate={mutate} />
}
