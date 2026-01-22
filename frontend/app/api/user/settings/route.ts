import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { ensureUserExists } from "@/lib/supabase/ensure-user"
import { encrypt } from "@/lib/edge/encryption"

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
    .select("meta_pixel_id, meta_encrypted_access_token, meta_encryption_iv")
    .eq("id", supabaseUserId)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    meta_pixel_id: user?.meta_pixel_id || null,
    meta_access_token_set: !!(user?.meta_encrypted_access_token && user?.meta_encryption_iv),
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
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // Validate Meta Pixel ID format (should be numeric, typically 15-16 digits)
  if (body.meta_pixel_id !== undefined) {
    if (body.meta_pixel_id === null || body.meta_pixel_id === "") {
      updateData.meta_pixel_id = null
    } else {
      const pixelId = String(body.meta_pixel_id).trim()
      if (!/^\d{10,20}$/.test(pixelId)) {
        return NextResponse.json(
          { error: "Invalid Meta Pixel ID format. It should be a 10-20 digit number." },
          { status: 400 }
        )
      }
      updateData.meta_pixel_id = pixelId
    }
  }

  if (body.meta_access_token !== undefined) {
    if (body.meta_access_token === null || body.meta_access_token === "") {
      updateData.meta_encrypted_access_token = null
      updateData.meta_encryption_iv = null
      updateData.meta_encryption_version = null
    } else {
      const token = String(body.meta_access_token).trim()
      if (token.length < 40 || token.length > 500) {
        return NextResponse.json(
          { error: "Invalid Meta CAPI access token format." },
          { status: 400 }
        )
      }

      try {
        const encrypted = await encrypt(token)
        updateData.meta_encrypted_access_token = encrypted.ciphertext
        updateData.meta_encryption_iv = encrypted.iv
        updateData.meta_encryption_version = encrypted.version
      } catch (error) {
        console.error("[user/settings] Failed to encrypt Meta CAPI token:", error)
        return NextResponse.json(
          { error: "Unable to encrypt access token. Check ENCRYPTION_KEY configuration." },
          { status: 500 }
        )
      }
    }
  }

  if (Object.keys(updateData).length === 1) {
    return NextResponse.json(
      { error: "No valid settings to update" },
      { status: 400 }
    )
  }

  const { data: user, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", supabaseUserId)
    .select("meta_pixel_id, meta_encrypted_access_token, meta_encryption_iv")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    meta_pixel_id: user?.meta_pixel_id || null,
    meta_access_token_set: !!(user?.meta_encrypted_access_token && user?.meta_encryption_iv),
    message: updateData.meta_pixel_id ? "Meta Pixel ID saved successfully" : "Settings saved successfully",
  })
}
