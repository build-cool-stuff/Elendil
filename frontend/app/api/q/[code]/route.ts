import { NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Lazy initialization to avoid build-time errors when env vars aren't set
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY
    if (!url || !key) {
      throw new Error("Supabase environment variables not configured")
    }
    supabase = createClient(url, key)
  }
  return supabase
}

/**
 * GET /api/q/[code]
 * Get campaign data by tracking code (public endpoint for QR redirects)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code) {
    return NextResponse.json({ error: "Invalid tracking code" }, { status: 400 })
  }

  try {
    const db = getSupabase()

    const normalizedCode = code.toLowerCase()
    const buildQuery = (value: string) =>
      db
        .from("campaigns")
        .select(`
          id,
          name,
          destination_url,
          cookie_duration_days,
          user_id
        `)
        .eq("tracking_code", value)
        .eq("status", "active")
        .maybeSingle()

    // Fetch campaign by tracking code (exact match first, then lowercase fallback)
    let { data: campaign, error } = await buildQuery(code)
    if (!campaign && normalizedCode !== code) {
      ;({ data: campaign, error } = await buildQuery(normalizedCode))
    }

    if (error || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Optionally fetch Meta pixel ID if user has Meta integration
    const { data: metaIntegration } = await db
      .from("meta_integrations")
      .select("pixel_id")
      .eq("user_id", campaign.user_id)
      .eq("status", "active")
      .single()

    return NextResponse.json({
      campaign: {
        ...campaign,
        pixel_id: metaIntegration?.pixel_id || null,
      },
    })
  } catch (err) {
    console.error("Error fetching campaign:", err)
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    )
  }
}
