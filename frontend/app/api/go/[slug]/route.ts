/**
 * API endpoint for bridge page campaign data
 * Returns minimal campaign info needed for client-side pixel firing
 *
 * Route: /api/go/[slug]
 * Runtime: Edge
 */

export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { lookupCampaign } from '@/lib/edge/supabase-edge'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const campaign = await lookupCampaign(slug)

  if (!campaign) {
    return NextResponse.json(
      { error: 'Campaign not found' },
      { status: 404 }
    )
  }

  // Return only public data needed for bridge page
  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    destination_url: campaign.destination_url,
    pixel_id: campaign.meta_pixel_id,
    bridge_duration_ms: campaign.bridge_duration_ms,
  })
}
