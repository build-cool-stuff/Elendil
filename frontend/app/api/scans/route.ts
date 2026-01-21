import { NextResponse } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { headers } from "next/headers"
import { UAParser } from "ua-parser-js"
import type { DeviceType, ScanInsert } from "@/lib/supabase/types"

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
 * Hash a string using SHA-256
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str + (process.env.HASH_SALT || ""))
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 32)
}

/**
 * Parse user agent to extract device info
 */
function parseUserAgent(ua: string): {
  deviceType: DeviceType | null
  browser: string | null
  os: string | null
} {
  const parser = new UAParser(ua)
  const result = parser.getResult()

  let deviceType: DeviceType | null = null
  const deviceTypeRaw = result.device.type

  if (deviceTypeRaw === "mobile") {
    deviceType = "mobile"
  } else if (deviceTypeRaw === "tablet") {
    deviceType = "tablet"
  } else if (!deviceTypeRaw || deviceTypeRaw === "desktop") {
    // If no device type detected or explicitly desktop
    deviceType = "desktop"
  }

  return {
    deviceType,
    browser: result.browser.name || null,
    os: result.os.name || null,
  }
}

/**
 * POST /api/scans
 * Record a QR code scan
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      campaign_id,
      visitor_id,
      latitude,
      longitude,
      suburb,
      postcode,
      state,
      is_first_scan = true,
    } = body

    if (!campaign_id || !visitor_id) {
      return NextResponse.json(
        { error: "campaign_id and visitor_id are required" },
        { status: 400 }
      )
    }

    // Verify campaign exists and is active
    const { data: campaign, error: campaignError } = await getSupabase()
      .from("campaigns")
      .select("id, cookie_duration_days, user_id")
      .eq("id", campaign_id)
      .eq("status", "active")
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found or inactive" },
        { status: 404 }
      )
    }

    // Get request headers
    const headersList = await headers()
    const userAgent = headersList.get("user-agent") || ""
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown"
    const referrer = headersList.get("referer") || null

    // Parse user agent
    const deviceInfo = parseUserAgent(userAgent)

    // Hash the IP for privacy
    const ipHash = await hashString(ip)

    // Calculate cookie expiration
    const cookieExpiresAt = new Date(
      Date.now() + campaign.cookie_duration_days * 24 * 60 * 60 * 1000
    ).toISOString()

    // Build scan record
    const scanData: ScanInsert = {
      campaign_id,
      visitor_id,
      ip_address_hash: ipHash,
      latitude: latitude || null,
      longitude: longitude || null,
      suburb: suburb || null,
      postcode: postcode || null,
      state: state || null,
      country: "Australia",
      user_agent: userAgent,
      device_type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      referrer,
      is_first_scan,
      cookie_expires_at: cookieExpiresAt,
    }

    // Insert scan
    const { data: scan, error: scanError } = await getSupabase()
      .from("scans")
      .insert(scanData)
      .select()
      .single()

    if (scanError) {
      console.error("Failed to insert scan:", scanError)
      return NextResponse.json(
        { error: "Failed to record scan" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, scan_id: scan.id }, { status: 201 })
  } catch (err) {
    console.error("Scan recording error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
