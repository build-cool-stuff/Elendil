import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Check if the given Clerk user ID matches the admin.
 * Uses ADMIN_USER_ID environment variable.
 */
export function isAdmin(clerkId: string | null): boolean {
  const adminId = process.env.ADMIN_USER_ID
  if (!adminId || !clerkId) return false
  return clerkId === adminId
}

/**
 * Server-side guard for admin pages.
 * Redirects to /dashboard if not admin.
 */
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth()
  if (!userId || !isAdmin(userId)) {
    redirect('/dashboard')
  }
  return userId
}

/**
 * API route guard for admin endpoints.
 * Returns clerkId if admin, null otherwise.
 */
export async function checkAdminApi(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId || !isAdmin(userId)) return null
  return userId
}
