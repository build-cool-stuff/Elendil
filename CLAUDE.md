# Elendil — QR Tracking SaaS for AU Real Estate Agents

## Stack
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS v4, Radix UI, glassmorphic dark-mode UI
- Clerk auth (embedded components, JWKS → Supabase Third-Party Auth)
- Supabase PostgreSQL with RLS via `requesting_user_id()` (extracts Clerk JWT `sub`)
- Edge Runtime on Vercel for all `/go/*` tracking routes
- BigDataCloud precision geo (primary), Vercel headers (fallback)
- Meta Conversions API (CAPI) + client Pixel with event_id dedup
- AES-256-GCM encryption (Meta tokens), SHA-256 + salt (IP hashing)

## Monorepo Layout
- `frontend/` — Next.js app (all development happens here)
- `shared-components/` — Radix UI wrapper package
- `supabase/migrations/` — 6 SQL migrations (001–006)

## Commands
```bash
cd frontend && npm run dev   # Dev server
npm run build                # Production build
npm run lint                 # Lint
npx tsx scripts/seed-suburbs.ts  # Seed AU suburb data
```

## Code Style
- Server Components by default; `"use client"` only for interactivity
- PascalCase component files, kebab-case directories
- Validate with Zod before Server Actions / API mutations
- Use `requesting_user_id()` in all RLS policies
- Geist font family, OKLCH color tokens, dark-mode only

## Prohibitions
1. NEVER store plaintext Meta access tokens — AES-256-GCM required
2. NEVER use Node runtime for `/go/*` routes — Edge only (`export const runtime = 'edge'`)
3. NEVER block on scan recording or CAPI events — fire-and-forget (void IIFE)
4. NEVER store raw IP addresses — SHA-256 hash with `IP_HASH_SALT`
5. NEVER use heavy libs on Edge (no `ua-parser-js`) — use `lib/edge/user-agent.ts`
6. NEVER omit `meta_event_id` when firing CAPI — required for deduplication
7. NEVER omit `geo_source` or `confidence_radius_km` when recording scans
8. NEVER omit VPN/proxy/tor flags — required for analytics filtering

## Edge Runtime Rules
- Use `@supabase/supabase-js` with `persistSession: false`
- Use Web Crypto API (`crypto.subtle`) for hashing/encryption
- Target <50ms response time for redirect handler
- Fire-and-forget pattern: wrap async ops in void IIFE

## Bridge Page Flow
```
QR scan → GET /go/[slug] (Edge, <50ms)
  → 307 to /go/[slug]/bridge?eid=xxx (if bridge_enabled)
  → Bridge loads, fires: Meta Pixel (client) + POST /api/go/[slug]/track (CAPI + geo + scan)
  → Auto-redirect to destination_url after bridge_duration_ms (default 800)
```

## Key Files
- QR redirect: `frontend/app/go/[slug]/route.ts` (Edge)
- Bridge page: `frontend/app/go/[slug]/bridge/page.tsx` (Client)
- Tracking endpoint: `frontend/app/api/go/[slug]/track/route.ts` (Edge)
- Dashboard: `frontend/components/dashboard/crm-dashboard.tsx`
- Edge utils: `frontend/lib/edge/` (bigdatacloud, meta-capi, encryption, cookies, geo, user-agent)
- Supabase clients: `frontend/lib/supabase/` (client.ts=browser+Clerk JWT, server.ts=secret key, ensure-user.ts=sync)
- Auth middleware: `frontend/middleware.ts`

## Routes
- **Public:** `/`, `/login`, `/signup`, `/go/[slug]`, `/go/[slug]/bridge`
- **Protected:** `/dashboard`, `/api/campaigns`, `/api/campaigns/[id]`, `/api/user/settings`
- **Webhooks:** `/api/webhooks/clerk` (Svix-verified user sync)

## Env Vars
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
ENCRYPTION_KEY (32-byte base64), IP_HASH_SALT
BIGDATACLOUD_API_KEY
NEXT_PUBLIC_APP_URL
```

## What's Built
QR gen + campaign CRUD, Edge redirect + bridge, BigDataCloud geo, Meta CAPI, Clerk auth + Supabase sync, cookie tracking, dashboard with filters, landing page with WebGL shaders

## Not Yet Built
Analytics dashboard (heat maps, charts), Meta OAuth flow, campaign attribution/ROI, custom domains, billing (Stripe), A/B testing

## Git Workflow
After making code changes, always commit and push to GitHub by default:
1. Stage the changed files (specific files, not `git add -A`)
2. Write a short, clear commit message describing the change
3. Push to the current branch on GitHub
