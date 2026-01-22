import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { ensureUserExists } from "@/lib/supabase/ensure-user"
import { QRCodeService } from "@/lib/services/qr-code.service"
import type { CookieDuration, TrackingUrlSource } from "@/lib/supabase/types"

const qrCodeService = new QRCodeService()

/**
 * GET /api/campaigns
 * List all campaigns for the authenticated user
 */
export async function GET(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure user exists in Supabase (handles first-time users and local dev)
  const supabaseUserId = await ensureUserExists()

  if (!supabaseUserId) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }

  const supabase = createServerClient()

  // Parse query params for filtering
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  // Build query
  let query = supabase
    .from("campaigns")
    .select("*", { count: "exact" })
    .eq("user_id", supabaseUserId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq("status", status)
  }

  const { data: campaigns, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    campaigns,
    pagination: {
      total: count,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}

/**
 * Determine the tracking base URL from request or provided value
 */
function determineTrackingBaseUrl(
  request: Request,
  providedUrl?: string
): { baseUrl: string; source: TrackingUrlSource } | { error: string } {
  // If user provided a custom URL, validate and use it
  if (providedUrl) {
    try {
      const url = new URL(providedUrl)
      return { baseUrl: url.origin, source: "custom" }
    } catch {
      return { error: "Invalid tracking base URL format" }
    }
  }

  // Extract from request headers
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")
  const forwardedProto = request.headers.get("x-forwarded-proto")

  if (origin) {
    return { baseUrl: origin, source: "auto" }
  }

  if (host) {
    // Determine protocol: use forwarded proto if available, otherwise infer from host
    const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https")
    return { baseUrl: `${protocol}://${host}`, source: "auto" }
  }

  return { error: "Could not determine tracking URL origin. Please provide tracking_base_url." }
}

/**
 * POST /api/campaigns
 * Create a new campaign with QR code
 */
export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Ensure user exists in Supabase (handles first-time users and local dev)
  const supabaseUserId = await ensureUserExists()

  if (!supabaseUserId) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }

  const supabase = createServerClient()

  // Parse request body
  const body = await request.json()
  const {
    name,
    description,
    destination_url,
    cookie_duration_days = 30,
    custom_tracking_code,
    bridge_duration_ms = 500,
    tracking_base_url: providedTrackingBaseUrl,
  } = body

  // Validate required fields
  if (!name || !destination_url) {
    return NextResponse.json(
      { error: "Name and destination URL are required" },
      { status: 400 }
    )
  }

  // Validate destination URL
  try {
    new URL(destination_url)
  } catch {
    return NextResponse.json(
      { error: "Invalid destination URL" },
      { status: 400 }
    )
  }

  // Validate cookie duration
  if (![30, 60, 90].includes(cookie_duration_days)) {
    return NextResponse.json(
      { error: "Cookie duration must be 30, 60, or 90 days" },
      { status: 400 }
    )
  }

  if (typeof bridge_duration_ms !== "number" || bridge_duration_ms < 100 || bridge_duration_ms > 5000) {
    return NextResponse.json(
      { error: "Bridge duration must be between 100 and 5000 milliseconds" },
      { status: 400 }
    )
  }

  // Determine tracking base URL
  const trackingUrlResult = determineTrackingBaseUrl(request, providedTrackingBaseUrl)

  if ("error" in trackingUrlResult) {
    return NextResponse.json(
      { error: trackingUrlResult.error },
      { status: 400 }
    )
  }

  const { baseUrl: trackingBaseUrl, source: trackingUrlSource } = trackingUrlResult

  try {
    // Generate tracking code
    const trackingCode = qrCodeService.generateTrackingCode(custom_tracking_code)

    // Check if tracking code already exists
    const { data: existing } = await supabase
      .from("campaigns")
      .select("id")
      .eq("tracking_code", trackingCode)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Tracking code already exists. Please choose a different one." },
        { status: 409 }
      )
    }

    // Generate QR code with the determined tracking base URL
    const qrResult = await qrCodeService.generateQRCode(trackingCode, trackingBaseUrl)

    // Insert campaign
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: supabaseUserId,
        name,
        description,
        destination_url,
        tracking_code: trackingCode,
        cookie_duration_days: cookie_duration_days as CookieDuration,
        bridge_enabled: true,
        bridge_duration_ms,
        tracking_base_url: trackingBaseUrl,
        tracking_url_source: trackingUrlSource,
        qr_code_svg: qrResult.qrCodeSvg,
        qr_code_data_url: qrResult.qrCodeDataUrl,
        status: "active",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        campaign,
        tracking_url: qrResult.trackingUrl,
      },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
