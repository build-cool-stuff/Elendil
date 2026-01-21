import { currentUser } from "@clerk/nextjs/server"
import { createServerClient } from "./server"

/**
 * Ensures the current Clerk user exists in Supabase.
 * Creates the user if they don't exist yet.
 *
 * This handles:
 * - Users who signed up before webhooks were configured
 * - Local development where Clerk webhooks don't work
 * - Edge cases where the webhook might have failed
 *
 * @returns The user's Supabase UUID, or null if not authenticated
 */
export async function ensureUserExists(): Promise<string | null> {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const supabase = createServerClient()

  // Try to find existing user
  const { data: existingUser, error: selectError } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUser.id)
    .single()

  if (existingUser) {
    return existingUser.id
  }

  // User doesn't exist - create them
  if (selectError?.code === "PGRST116") {
    // PGRST116 = "No rows returned" - this is expected
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )
    const email = primaryEmail?.emailAddress

    if (!email) {
      console.error("[ensureUserExists] No email found for Clerk user:", clerkUser.id)
      return null
    }

    const fullName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ") || null

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        clerk_id: clerkUser.id,
        email,
        full_name: fullName,
        avatar_url: clerkUser.imageUrl || null,
      })
      .select("id")
      .single()

    if (insertError) {
      // Handle race condition - user might have been created by webhook
      if (insertError.code === "23505") {
        // Duplicate key - user was created between our check and insert
        const { data: racedUser } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_id", clerkUser.id)
          .single()
        return racedUser?.id || null
      }
      console.error("[ensureUserExists] Failed to create user:", insertError)
      return null
    }

    console.log("[ensureUserExists] Created user in Supabase:", clerkUser.id)
    return newUser.id
  }

  // Some other error occurred
  console.error("[ensureUserExists] Failed to query user:", selectError)
  return null
}
