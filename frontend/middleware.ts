import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

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
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
