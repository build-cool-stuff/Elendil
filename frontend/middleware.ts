import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",                   // Landing page (public)
  "/login(.*)",          // Login page (public)
  "/signup(.*)",         // Signup page (public)
  "/api/webhooks/clerk(.*)",
  "/q/(.*)",             // QR code bridge pages (legacy, public)
  "/api/q/(.*)",         // QR code lookup API (legacy, public)
  "/go/(.*)",            // New QR code redirect routes (Edge, public)
  "/api/go/(.*)",        // New QR code API (Edge, public)
  "/api/scans",          // Scan recording API (public)
  "/api/webhooks/stripe(.*)",  // Stripe webhooks (signature-verified)
  "/api/cron/(.*)",      // Cron jobs (secret-protected)
  "/api/billing/emit-usage",   // Internal billing endpoint (API key-protected)
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  // Auto-redirect admin to /admin after login
  // Clerk sends everyone to /dashboard — admin should land on /admin instead
  // ?from=user bypass lets admin explicitly visit the user dashboard via sidebar link
  const { pathname, searchParams } = request.nextUrl
  if (pathname === "/dashboard") {
    const fromUser = searchParams.has("from")

    if (!fromUser) {
      const { userId } = await auth()
      if (userId && userId === process.env.ADMIN_USER_ID) {
        return NextResponse.redirect(new URL("/admin", request.url))
      }
    }

    // Both admin-with-?from=user and normal users land on /dashboard/qr-codes
    return NextResponse.redirect(new URL("/dashboard/qr-codes", request.url))
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
