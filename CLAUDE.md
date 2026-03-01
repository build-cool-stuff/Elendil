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
- Stripe metered billing (usage-based, per-scan pricing)

## Monorepo Layout
- `frontend/` — Next.js app (all development happens here)
- `shared-components/` — Radix UI wrapper package
- `scripts/` — Utility scripts (seed-suburbs.ts)
- `supabase/migrations/` — 9 SQL migrations (001–009)

## Commands
```bash
cd frontend && npm run dev   # Dev server
npm run build                # Production build
npm run lint                 # Lint
npx tsx scripts/seed-suburbs.ts  # Seed AU suburb data
```

## Code Style
- Server Components by default; `"use client"` only for interactivity
- kebab-case component files and directories (e.g., `billing-panel.tsx`, `sidebar-nav.tsx`)
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
  → Billing check (piggybacks on campaign lookup, 1 extra count query)
  → DEGRADED: 302 to destination_url (basic scan recorded, no premium features)
  → ACTIVE + bridge_enabled: 307 to /go/[slug]/bridge?eid=xxx
    → Bridge loads, fires: Meta Pixel (client) + POST /api/go/[slug]/track (CAPI + geo + scan)
    → Auto-redirect to destination_url after bridge_duration_ms (default 800)
  → ACTIVE + no bridge: fire CAPI + record scan + 302 to destination_url
```

## Key Files
- Dashboard layout: `frontend/app/dashboard/layout.tsx` (Server) → `frontend/components/dashboard/dashboard-shell.tsx` (Client — WebGL shaders, sidebar, mobile drawer)
- Dashboard pages: `frontend/app/dashboard/` (nested routes: `page.tsx`, `billing/`, `settings/`, `support/`, `map/`, `campaigns/`)
- Dashboard error: `frontend/app/dashboard/error.tsx` (error boundary for all dashboard routes)
- Sidebar nav: `frontend/components/dashboard/sidebar-nav.tsx` (Link-based routing with `usePathname()`)
- QR redirect: `frontend/app/go/[slug]/route.ts` (Edge)
- Bridge page: `frontend/app/go/[slug]/bridge/page.tsx` (Client)
- Tracking endpoint: `frontend/app/api/go/[slug]/track/route.ts` (Edge)
- Dashboard components: `frontend/components/dashboard/` (dashboard-shell.tsx, billing-panel.tsx, billing-warnings.tsx, qr-code-generator.tsx, settings-panel.tsx, support-panel.tsx)
- Edge utils: `frontend/lib/edge/` (bigdatacloud, meta-capi, encryption, cookies, geo, user-agent, supabase-edge, index)
- Stripe billing: `frontend/lib/stripe/` (client.ts, billing.ts, billing-check.ts)
- Supabase clients: `frontend/lib/supabase/` (client.ts=browser+Clerk JWT, server.ts=secret key, ensure-user.ts=sync, types.ts)
- QR service: `frontend/lib/services/qr-code.service.ts`
- Auth middleware: `frontend/middleware.ts`

## Dashboard Routing
The dashboard uses Next.js App Router nested routes with a shared `layout.tsx`:
- `/dashboard` — QR Code Generator (default tab)
- `/dashboard/map` — Heat Map (coming soon)
- `/dashboard/campaigns` — Meta Campaigns (coming soon)
- `/dashboard/billing` — Billing & usage panel (handles Stripe `?billing=success` callback)
- `/dashboard/settings` — Meta Pixel, CAPI token, appearance
- `/dashboard/support` — Founder contact

The layout persists the WebGL shader background, sidebar nav, mobile drawer, and billing warnings across all tab navigations. Navigation uses `<Link>` with `usePathname()` for active state.

## Routes
- **Public:** `/`, `/login`, `/signup`, `/go/[slug]`, `/go/[slug]/bridge`, `/q/[code]` (alternate QR lookup)
- **Protected:** `/dashboard/*`, `/api/campaigns`, `/api/campaigns/[id]`, `/api/user/settings`, `/api/billing/*`, `/api/scans`
- **Billing API:** `/api/billing/setup` (checkout session), `/api/billing/portal` (Stripe customer portal), `/api/billing/status` (comprehensive billing status)
- **Webhooks:** `/api/webhooks/clerk` (Svix-verified user sync), `/api/webhooks/stripe` (signature-verified billing events)
- **Internal:** `/api/billing/emit-usage` (API key, Node-only Stripe meter emission)
- **Cron:** `/api/cron/retry-usage` (retry failed meter events, every 5 min), `/api/cron/enforce-grace` (degrade users after grace expiry, every 5 min)

## Billing Architecture

### Pricing Model
- **$20 AUD per unique scan** (first scan per device per campaign, deduplicated via `is_first_scan` cookie tracking)
- **$5,000 AUD monthly spend cap** — prevents runaway charges (250 first scans max before degradation)
- **Billing cycle:** Monthly, in arrears (charged after usage accrues)
- **No minimum:** Users pay $0 if they get no scans

### Stripe Integration
- **Metered billing** via Stripe Billing Meter API (`stripe.billing.meterEvents.create()`)
- **Checkout:** `/api/billing/setup` creates a Stripe Checkout session (`mode: 'subscription'`)
- **Self-service:** `/api/billing/portal` redirects to Stripe Customer Portal (invoices, payment method, cancellation)
- **Webhook events handled:** `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

### Write-Ahead Meter Events (Reliability Pattern)
1. Scan recorded with `is_first_scan: true` → insert row to `scan_usage_events` table (status: `pending`)
2. Fire-and-forget call to `/api/billing/emit-usage` (Node runtime, not Edge)
3. Emit-usage endpoint calls Stripe meter API, marks event `sent` or `failed`
4. Idempotency key: `scan_${eventId}` (unique constraint prevents duplicate charges)
5. Failed events retried by `/api/cron/retry-usage` every 5 minutes (max 5 retries)
6. After 5 failures → marked `dead_letter` (no more retries, logged for investigation)

### Grace Period & Degradation Flow
```
invoice.payment_failed webhook
  → Set grace_period_end = now + 24 hours (only if not already set)
  → Premium features continue during grace period

/api/cron/enforce-grace (every 5 min)
  → Find users where grace_period_end <= now AND degraded_since IS NULL
  → Set billing_active = false, degraded_since = now

invoice.paid webhook
  → Clear grace_period_end, clear degraded_since
  → Set billing_active = true (full recovery)

customer.subscription.deleted webhook
  → No grace period — immediate degradation
  → Set billing_active = false, degraded_since = now
```

### Degradation Triggers
1. **Spend cap reached:** `accrued_spend >= $5,000 AUD` (250 first scans × $20) — resets next billing period
2. **Payment failed + grace expired:** 24-hour grace, then degraded by cron
3. **Subscription canceled:** Immediate degradation (no grace for voluntary cancel)

### Premium vs Degraded Feature Matrix
| Feature | Premium | Degraded |
|---------|---------|----------|
| QR redirect to destination | Yes | Yes (never breaks) |
| Basic scan recording | Yes | Yes (device + Vercel geo) |
| Bridge page | Yes | No (direct 302 redirect) |
| Meta Pixel (client) | Yes | No |
| Meta CAPI (server) | Yes | No |
| BigDataCloud precision geo | Yes | No (Vercel headers fallback) |
| Suburb lookup | Yes | No |
| Billing meter emission | Yes | No |

### Billing-Related Database Schema
**Users table columns** (added by migrations 007, 009):
- `stripe_customer_id` — Stripe customer ID
- `billing_active` — Subscription is active/trialing (boolean, default false)
- `grace_period_end` — When 24-hour grace period expires
- `degraded_since` — When degradation started (used for missed leads counting)

**billing_subscriptions table:** Tracks Stripe subscription lifecycle (status, period dates, cancellation)

**scan_usage_events table:** Write-ahead queue for meter events (pending → sent/failed → dead_letter)

### Missed Leads Tracking
When degraded, the dashboard shows "X leads missed since [date]" — counts `is_first_scan = true` scans since `degraded_since` timestamp. Warns users about lost Meta Pixel events and precision geo data.

### Billing Check in Edge Runtime
`checkBillingFromCampaign()` in `lib/stripe/billing-check.ts` runs on every QR scan:
- Piggybacks on campaign lookup (user billing fields included)
- One extra count query for current-period first scans
- **Fail-open policy:** If count query fails, returns `degraded: false` (allow premium features)

### First Scan Deduplication (Cookie-Based)
- `elendil_vid` cookie — Visitor UUID (persistent across campaigns)
- `elendil_campaigns` cookie — Set of campaign IDs visited
- First visit from device → `is_first_scan: true` (billable)
- Repeat visit within cookie expiry → `is_first_scan: false` (free)
- Cookie expires → next visit is billable again

## SQL Migrations
1. `001_qr_tracking_schema.sql` — Core schema (users, campaigns, scans tables + RLS)
2. `002_edge_enhancements.sql` — Edge runtime optimizations
3. `003_bigdatacloud_precision_geo.sql` — Precision geo columns
4. `004_user_meta_pixel_id.sql` — Meta Pixel ID on users
5. `005_tracking_base_url.sql` — Base URL tracking
6. `006_user_meta_capi_token.sql` — Encrypted Meta CAPI token storage
7. `007_stripe_billing.sql` — Billing infrastructure (billing_subscriptions, scan_usage_events, user billing columns)
8. `008_remove_scan_cap.sql` — Removed per-user scan limits
9. `009_billing_grace_period.sql` — Grace period + degradation tracking columns

## Env Vars
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET
ENCRYPTION_KEY (32-byte base64), IP_HASH_SALT
BIGDATACLOUD_API_KEY
NEXT_PUBLIC_APP_URL
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID, STRIPE_METER_EVENT_NAME
CRON_SECRET, INTERNAL_API_KEY
```

## What's Built
QR gen + campaign CRUD, Edge redirect + bridge, BigDataCloud geo, Meta CAPI, Clerk auth + Supabase sync, cookie tracking, dashboard with filters + billing panel + billing warnings, landing page with WebGL shaders, Stripe metered billing ($20 AUD/scan, $5000 spend cap, 24h grace period, write-ahead meter events with retry queue, missed leads tracking)

## Not Yet Built
Analytics dashboard (heat maps, charts), Meta OAuth flow, campaign attribution/ROI, custom domains, A/B testing

## Allowed Tools (no confirmation needed)
Claude is explicitly allowed to do all of the following without asking for permission:

### File Operations
- Read, edit, and create any file in the repo
- Search the codebase (glob, grep)

### Shell Commands
- `npm install`, `npm run dev`, `npm run build`, `npm run lint`
- `npx tsc --noEmit` (type checking)
- `npx tsx` (running scripts)
- All git commands: `git status`, `git diff`, `git log`, `git add`, `git commit`, `git push`, `git checkout`, `git branch`

### Web Access
- Use WebFetch and WebSearch freely — no confirmation needed
- Fetch documentation, API references, npm packages, Stack Overflow, GitHub issues, etc.
- Search the web for current best practices, library docs, or error solutions
- Proactively research when encountering unfamiliar APIs, libraries, or error messages

### Git Workflow
After making code changes, always commit and push to GitHub by default:
1. Stage the changed files (specific files, not `git add -A`)
2. Write a short, clear commit message describing the change
3. Push to the current branch on GitHub
