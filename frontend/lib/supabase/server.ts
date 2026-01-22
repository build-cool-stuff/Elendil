import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY"
    )
  }

  // Validate that secret key is not accidentally set to the publishable key
  if (publishableKey && secretKey === publishableKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is set to the same value as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "The secret key should be from Supabase Dashboard > Settings > API > secret key (sb_secret_...)."
    )
  }

  return createSupabaseClient(supabaseUrl, secretKey)
}
