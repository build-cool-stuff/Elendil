import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { ensureUserExists } from "@/lib/supabase/ensure-user"
import type { CampaignStatus, CookieDuration } from "@/lib/supabase/types"

/**
 * GET /api/campaigns/[id]
 * Get a single campaign by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure user exists in Supabase
  const supabaseUserId = await ensureUserExists()

  if (!supabaseUserId) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }

  const { id } = await params
  const supabase = createServerClient()

  // Get campaign
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", supabaseUserId)
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // Get scan count for this campaign
  const { count: scanCount } = await supabase
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", id)

  // Get unique visitor count
  const { data: uniqueVisitors } = await supabase
    .from("scans")
    .select("visitor_id")
    .eq("campaign_id", id)

  const uniqueCount = new Set(uniqueVisitors?.map((s) => s.visitor_id)).size

  return NextResponse.json({
    campaign,
    stats: {
      total_scans: scanCount || 0,
      unique_visitors: uniqueCount,
    },
  })
}

/**
 * PATCH /api/campaigns/[id]
 * Update a campaign
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure user exists in Supabase
  const supabaseUserId = await ensureUserExists()

  if (!supabaseUserId) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }

  const { id } = await params
  const supabase = createServerClient()

  // Verify campaign belongs to user
  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .eq("user_id", supabaseUserId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  // Parse request body
  const body = await request.json()
  const updateData: Record<string, unknown> = {}

  // Only allow updating specific fields
  if (body.name !== undefined) {
    updateData.name = body.name
  }
  if (body.description !== undefined) {
    updateData.description = body.description
  }
  if (body.destination_url !== undefined) {
    // Validate URL
    try {
      new URL(body.destination_url)
      updateData.destination_url = body.destination_url
    } catch {
      return NextResponse.json(
        { error: "Invalid destination URL" },
        { status: 400 }
      )
    }
  }
  if (body.cookie_duration_days !== undefined) {
    if (![30, 60, 90].includes(body.cookie_duration_days)) {
      return NextResponse.json(
        { error: "Cookie duration must be 30, 60, or 90 days" },
        { status: 400 }
      )
    }
    updateData.cookie_duration_days = body.cookie_duration_days as CookieDuration
  }
  if (body.status !== undefined) {
    if (!["active", "paused", "archived"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }
    updateData.status = body.status as CampaignStatus
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    )
  }

  // Update campaign
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", supabaseUserId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ campaign })
}

/**
 * DELETE /api/campaigns/[id]
 * Delete (archive) a campaign
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure user exists in Supabase
  const supabaseUserId = await ensureUserExists()

  if (!supabaseUserId) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }

  const { id } = await params
  const supabase = createServerClient()

  // Archive the campaign instead of hard delete (preserve data)
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "archived" as CampaignStatus })
    .eq("id", id)
    .eq("user_id", supabaseUserId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
