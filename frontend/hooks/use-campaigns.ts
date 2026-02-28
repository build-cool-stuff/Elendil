import useSWR from "swr"
import type { Campaign } from "@/lib/supabase/types"

interface CampaignWithStats extends Campaign {
  stats?: {
    total_scans: number
    unique_visitors: number
  }
}

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch campaigns")
      return res.json()
    })
    .then((data) => (data.campaigns || []) as CampaignWithStats[])

export function useCampaigns() {
  const { data, error, isLoading, mutate } = useSWR<CampaignWithStats[]>(
    "/api/campaigns",
    fetcher,
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  )

  return {
    campaigns: data ?? [],
    isLoading,
    error,
    mutate,
  }
}

export type { CampaignWithStats }
