import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { useSession } from "@clerk/nextjs"

type SessionReturn = ReturnType<typeof useSession>
type Session = SessionReturn["session"]

/**
 * Creates an authenticated Supabase client using Clerk's session token.
 * The token is injected into the Authorization header for every request.
 *
 * @example
 * // In a Client Component:
 * "use client"
 * import { useSession } from "@clerk/nextjs"
 * import { createClient } from "@/lib/supabase/client"
 *
 * function MyComponent() {
 *   const { session } = useSession()
 *   const supabase = createClient(session)
 *
 *   // Use supabase client...
 * }
 */
export function createClient(session: Session): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await session?.getToken()

          const headers = new Headers(options?.headers)
          if (clerkToken) {
            headers.set("Authorization", `Bearer ${clerkToken}`)
          }

          return fetch(url, {
            ...options,
            headers,
          })
        },
      },
    }
  )
}

/**
 * Creates an unauthenticated Supabase client for public data access.
 * Use this when no user session is needed (e.g., public pages).
 */
export function createPublicClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

/**
 * React hook wrapper for creating an authenticated Supabase client.
 * Must be used within a component that has access to Clerk's session.
 *
 * @example
 * // In a Client Component:
 * "use client"
 * import { useSession } from "@clerk/nextjs"
 * import { useSupabase } from "@/lib/supabase/client"
 *
 * function MyComponent() {
 *   const { session } = useSession()
 *   const supabase = useSupabase(session)
 *
 *   useEffect(() => {
 *     async function fetchData() {
 *       const { data } = await supabase.from("campaigns").select("*")
 *     }
 *     fetchData()
 *   }, [supabase])
 * }
 */
export function useSupabase(session: Session): SupabaseClient {
  return createClient(session)
}
