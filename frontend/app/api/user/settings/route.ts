import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { ensureUserExists } from "@/lib/supabase/ensure-user"

/**
 * GET /api/user/settings
 * Get the current user's settings including Meta Pixel ID
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUserId = await ensureUserExists()

  if (!supabaseUserId) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }

  const supabase = createServerClient()

  const { data: user, error } = await supabase
    .from("users")
    .select("meta_pixel_id")
    .eq("id", supabaseUserId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    meta_pixel_id: user?.meta_pixel_id || null,
  })
}

/**
 * PATCH /api/user/settings
 * Update the current user's settings
 */
export async function PATCH(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUserId = await ensureUserExists()

  if (!supabaseUserId) {
    return NextResponse.json({ error: "Failed to sync user" }, { status: 500 })
  }

  const supabase = createServerClient()
  const body = await request.json()

  // Validate Meta Pixel ID format (should be numeric, typically 15-16 digits)
  if (body.meta_pixel_id !== undefined && body.meta_pixel_id !== null && body.meta_pixel_id !== "") {
    const pixelId = String(body.meta_pixel_id).trim()
    if (!/^\d{10,20}$/.test(pixelId)) {
      return NextResponse.json(
        { error: "Invalid Meta Pixel ID format. It should be a 10-20 digit number." },
        { status: 400 }
      )
    }
    body.meta_pixel_id = pixelId
  } else {
    // Allow clearing the pixel ID
    body.meta_pixel_id = null
  }

  const { data: user, error } = await supabase
    .from("users")
    .update({
      meta_pixel_id: body.meta_pixel_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supabaseUserId)
    .select("meta_pixel_id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    meta_pixel_id: user?.meta_pixel_id || null,
    message: body.meta_pixel_id ? "Meta Pixel ID saved successfully" : "Meta Pixel ID removed",
  })
}
