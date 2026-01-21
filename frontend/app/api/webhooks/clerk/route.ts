import { Webhook } from "svix"
import { headers } from "next/headers"
import { WebhookEvent } from "@clerk/nextjs/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events for user synchronization.
 *
 * Supported events:
 * - user.created: Insert new user into Supabase
 * - user.updated: Update user profile in Supabase
 * - user.deleted: Remove user from Supabase
 *
 * Setup:
 * 1. Go to Clerk Dashboard → Webhooks → Add Endpoint
 * 2. URL: https://your-domain.com/api/webhooks/clerk
 * 3. Subscribe to: user.created, user.updated, user.deleted
 * 4. Copy the Signing Secret and add to .env.local as CLERK_WEBHOOK_SECRET
 */
export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set")
    return new Response("Webhook secret not configured", { status: 500 })
  }

  // Get headers
  const headerPayload = await headers()
  const svixId = headerPayload.get("svix-id")
  const svixTimestamp = headerPayload.get("svix-timestamp")
  const svixSignature = headerPayload.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  // Get body
  const payload = await request.json()
  const body = JSON.stringify(payload)

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Webhook verification failed:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  const supabase = createServerClient()

  // Handle events
  switch (event.type) {
    case "user.created": {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      const primaryEmail = email_addresses.find((e) => e.id === event.data.primary_email_address_id)
      const email = primaryEmail?.email_address

      if (!email) {
        console.error("No email found for user:", id)
        return new Response("No email found", { status: 400 })
      }

      const fullName = [first_name, last_name].filter(Boolean).join(" ") || null

      const { error } = await supabase.from("users").insert({
        clerk_id: id,
        email,
        full_name: fullName,
        avatar_url: image_url || null,
      })

      if (error) {
        // Handle duplicate key error gracefully (user might already exist)
        if (error.code === "23505") {
          console.log("User already exists:", id)
          return new Response("User already exists", { status: 200 })
        }
        console.error("Failed to create user:", error)
        return new Response("Failed to create user", { status: 500 })
      }

      console.log("User created:", id)
      return new Response("User created", { status: 201 })
    }

    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url } = event.data

      const primaryEmail = email_addresses.find((e) => e.id === event.data.primary_email_address_id)
      const email = primaryEmail?.email_address

      const fullName = [first_name, last_name].filter(Boolean).join(" ") || null

      const updateData: Record<string, unknown> = {
        full_name: fullName,
        avatar_url: image_url || null,
      }

      if (email) {
        updateData.email = email
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("clerk_id", id)

      if (error) {
        console.error("Failed to update user:", error)
        return new Response("Failed to update user", { status: 500 })
      }

      console.log("User updated:", id)
      return new Response("User updated", { status: 200 })
    }

    case "user.deleted": {
      const { id } = event.data

      if (!id) {
        return new Response("No user ID provided", { status: 400 })
      }

      const { error } = await supabase.from("users").delete().eq("clerk_id", id)

      if (error) {
        console.error("Failed to delete user:", error)
        return new Response("Failed to delete user", { status: 500 })
      }

      console.log("User deleted:", id)
      return new Response("User deleted", { status: 200 })
    }

    default:
      console.log("Unhandled webhook event:", event.type)
      return new Response("Event not handled", { status: 200 })
  }
}
