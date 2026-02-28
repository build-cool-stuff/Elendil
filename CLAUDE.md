# Project Spec: Free Real Estate (Elendil)

## Project Vision

A QR tracking & suburb analytics SaaS for **Australian real estate agents**. Prioritizes suburb-level geo precision via BigDataCloud and Meta CAPI attribution for ad performance tracking.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Glassmorphic UI design |
| UI Components | Radix UI, shared-components package |
| Authentication | Clerk (embedded components) |
| Database | Supabase (PostgreSQL with RLS) |
| Edge Runtime | Vercel Edge Functions |
| Tracking | Meta Conversions API (CAPI) + Client Pixel |
| Security | AES-256 for token encryption |
| Geo Data | BigDataCloud Network Topology + Vercel fallback |

---

## Architecture Guidelines

### 1. Unified App Structure
- Monorepo: `frontend/` (Next.js app), `shared-components/` (Radix UI lib), `supabase/` (migrations)
- All features live in one Next.js project under `frontend/`
- No route groups used — flat structure with Clerk middleware for auth
- Public routes: `/`, `/login`, `/signup`, `/go/[slug]`, `/go/[slug]/bridge`
- Protected routes: `/dashboard`, `/api/campaigns`, `/api/user/settings`
- Edge Functions for all tracking endpoints (`/go/` routes)

### 2. The Bridge (Redirect Logic)

**Route:** `/go/[slug]`

**Default Behavior:**
- 800ms "Bridge" page to fire Meta Pixel and CAPI
- Configurable per campaign (`bridge_enabled`, `bridge_duration_ms`)

**Domain Strategy:**
- **Shared Pool:** For trial/low-tier users (monitor via Google Safe Browsing API)
- **Custom Domains:** CNAME support for subscribers to sandbox domain reputation

### 3. Location & Suburb Precision (BigDataCloud)

**Primary Source:** BigDataCloud Network Topology Geolocation API
- Provides suburb-level precision (confidence radius typically <5km)
- ISP exchange-based location (more accurate than IP-only)
- VPN/Proxy/Tor detection flags

**Fallback:** Vercel `x-vercel-ip-postal-code` header

**API Endpoint:** `https://api.bigdatacloud.net/data/ip-geolocation-full`

**Confidence Levels:**
| Level | Radius | Accuracy |
|-------|--------|----------|
| high | <1km | Suburb-precise |
| medium | 1-5km | Neighborhood |
| low | 5-20km | Postcode-level |
| unreliable | >20km | City-level only |

**Implementation Pattern:**
```typescript
import { fetchPrecisionGeo, mergeWithVercelFallback } from '@/lib/edge/bigdatacloud'

const precisionGeo = await fetchPrecisionGeo(clientIP)
const finalGeo = mergeWithVercelFallback(precisionGeo, vercelGeo)
// finalGeo.locality_name = "Bondi Beach"
// finalGeo.confidence_radius_km = 0.8
```

### 4. Security Requirements

**Meta Access Tokens:**
- AES-256 encryption required
- Stored in `encrypted_access_token` column with `encryption_iv`
- Never store plaintext tokens

**IP Addresses:**
- Hash with SHA-256 before storage
- Use environment-based salt (`IP_HASH_SALT`)

### 5. Edge Runtime Rules

All tracking endpoints MUST use Edge Runtime:
```typescript
export const runtime = 'edge'
```

**Edge-compatible patterns:**
- Use `@supabase/supabase-js` with `persistSession: false`
- Lightweight UA parsing (no heavy libraries)
- Web Crypto API for hashing/encryption
- Fire-and-forget for non-critical operations

---

## Database Schema (Key Tables)

### campaigns
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Owner |
| name | VARCHAR | Campaign name |
| destination_url | TEXT | Redirect destination |
| tracking_code | VARCHAR | Unique code |
| slug | VARCHAR | User-friendly URL slug |
| cookie_duration_days | INT | 30, 60, or 90 |
| bridge_enabled | BOOL | Show bridge page |
| bridge_duration_ms | INT | Bridge delay (default 800) |
| custom_domain | VARCHAR | Optional CNAME domain |

### scans
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | Campaign FK |
| visitor_id | VARCHAR | Cookie-based ID |
| ip_address_hash | VARCHAR | Hashed IP |
| locality_name | VARCHAR | BigDataCloud suburb name |
| city | VARCHAR | City name |
| suburb | VARCHAR | Legacy field (= locality_name) |
| postcode | VARCHAR | Postal code |
| state | VARCHAR | State name |
| state_code | VARCHAR | State abbreviation (NSW, VIC) |
| country | VARCHAR | Country name |
| country_code | VARCHAR | ISO country code (AU) |
| confidence_radius_km | DECIMAL | Geo precision in km |
| geo_source | VARCHAR | 'bigdatacloud' / 'vercel' / 'fallback' |
| isp_name | VARCHAR | Internet service provider |
| network_type | VARCHAR | ISP network classification |
| connection_type | VARCHAR | Connection type |
| is_vpn | BOOLEAN | VPN detected |
| is_proxy | BOOLEAN | Proxy detected |
| is_tor | BOOLEAN | Tor exit node detected |
| device_type | VARCHAR | mobile/tablet/desktop |
| meta_event_id | VARCHAR | For CAPI deduplication |

### suburbs
| Column | Type | Description |
|--------|------|-------------|
| name | VARCHAR | Suburb name |
| postcode | VARCHAR | Australian postcode |
| state | VARCHAR | State abbreviation |
| latitude | DECIMAL | Center coordinates |
| longitude | DECIMAL | Center coordinates |
| population | INT | For priority sorting |

---

## API Routes

### Public (No Auth)
| Route | Runtime | Purpose |
|-------|---------|---------|
| `/go/[slug]` | Edge | QR redirect handler |
| `/api/go/[slug]` | Edge | Bridge page data |
| `/api/go/[slug]/track` | Edge | Precision geo tracking |
| `/api/scans` | Node | Legacy scan recording |
| `/api/webhooks/clerk` | Node | User sync |

### Protected (Auth Required)
| Route | Runtime | Purpose |
|-------|---------|---------|
| `/api/campaigns` | Node | Campaign CRUD (GET list, POST create) |
| `/api/campaigns/[id]` | Node | Single campaign (GET with stats, PATCH update) |
| `/api/user/settings` | Node | User profile settings |

### Pages
| Route | Type | Purpose |
|-------|------|---------|
| `/` | Client Component | Landing page (glassmorphic, WebGL shaders) |
| `/login` | Client Component | Clerk sign-in UI |
| `/signup` | Client Component | Clerk sign-up UI |
| `/dashboard` | Server Component | Main dashboard (campaigns, QR gen, settings) |
| `/go/[slug]/bridge` | Client Component | Notice-only tracking bridge page |

---

## Code Style

### Components
- Default to Server Components
- Use `"use client"` only for interactivity
- PascalCase for component files
- kebab-case for directories

### Database
- SQL-First: Provide migrations before implementation
- Always validate with Zod before Server Actions
- Use `requesting_user_id()` for RLS policies

### Edge Functions
- No `ua-parser-js` - use lightweight custom parser
- Use `crypto.subtle` for hashing
- Fire-and-forget for async operations
- Maximum 50ms target response time

---

## Commands

```bash
# Development
cd frontend && npm run dev

# Build
npm run build

# Lint
npm run lint

# Seed suburbs data
npx tsx scripts/seed-suburbs.ts
```

---

## Environment Variables

```env
# Supabase (New API Keys - replaces legacy anon/service_role JWT keys)
# See: https://supabase.com/docs/guides/api/api-keys
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Security
ENCRYPTION_KEY=<32-byte-base64-key>
IP_HASH_SALT=<random-salt>

# BigDataCloud (Precision Geo)
BIGDATACLOUD_API_KEY=<api-key-from-bigdatacloud.com>

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Critical Implementation Rules

1. **Never** store plaintext Meta access tokens
2. **Always** use Edge runtime for `/go/` routes
3. **Always** use BigDataCloud as primary geo source, Vercel as fallback
4. **Never** block on scan recording (fire-and-forget)
5. **Always** include `meta_event_id` for CAPI deduplication
6. **Always** hash IP addresses before storage
7. **Always** store `geo_source` and `confidence_radius_km` with scans
8. **Always** flag VPN/Proxy/Tor connections for analytics filtering

---

## Bridge Page (Notice-Only Approach)

The bridge page uses a **notice-only** approach for minimal friction:

1. Page loads immediately with a subtle analytics notice banner
2. Background: Fetch precision geo from BigDataCloud
3. Background: Fire Meta Pixel + CAPI event with deduplication
4. Background: Record scan with granular location data
5. Auto-redirect when tracking completes (no user action needed)
6. Fallback timer ensures redirect after `bridge_duration_ms` regardless of tracking status

**Key Files:**
- `app/go/[slug]/route.ts` - Edge redirect handler (decides bridge vs direct)
- `app/go/[slug]/bridge/page.tsx` - Notice-only bridge UI (client component)
- `app/api/go/[slug]/route.ts` - GET campaign data for bridge
- `app/api/go/[slug]/track/route.ts` - POST precision tracking endpoint
- `lib/edge/bigdatacloud.ts` - BigDataCloud API client

---

## Edge Utilities (`lib/edge/`)

| File | Purpose |
|------|---------|
| `supabase-edge.ts` | Edge-compatible Supabase client |
| `geo.ts` | Vercel geo header extraction |
| `bigdatacloud.ts` | BigDataCloud precision geo API |
| `user-agent.ts` | Lightweight UA parser (no deps) |
| `cookies.ts` | Cookie utilities for Edge Response |
| `encryption.ts` | AES-256-GCM encryption |
| `meta-capi.ts` | Meta Conversions API client |
| `index.ts` | Re-exports all edge utilities |

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout (Clerk + Meta Pixel)
│   ├── page.tsx                # Landing page
│   ├── dashboard/page.tsx      # Protected dashboard
│   ├── login/[[...sign-in]]/   # Clerk sign-in
│   ├── signup/[[...sign-up]]/  # Clerk sign-up
│   ├── go/[slug]/
│   │   ├── route.ts            # Edge QR redirect handler
│   │   └── bridge/page.tsx     # Bridge tracking page
│   ├── q/[code]/               # Legacy QR redirect (deprecated)
│   └── api/                    # API routes (see API Routes section)
├── components/
│   ├── dashboard/
│   │   ├── crm-dashboard.tsx   # Main dashboard shell (tabs, WebGL bg)
│   │   └── qr-code-generator.tsx # Campaign creation + QR list
│   ├── landing/                # Landing page sections
│   ├── custom-cursor.tsx       # Custom mouse cursor effect
│   ├── grain-overlay.tsx       # Grain texture overlay
│   └── magnetic-button.tsx     # Magnetic follow button
├── lib/
│   ├── edge/                   # Edge Runtime utilities (see table above)
│   ├── supabase/
│   │   ├── client.ts           # Authenticated Supabase client
│   │   ├── server.ts           # Server-side Supabase client
│   │   ├── ensure-user.ts      # Clerk → Supabase user sync
│   │   └── types.ts            # TypeScript types
│   ├── services/
│   │   └── qr-code.service.ts  # QR code generation (nanoid + qrcode lib)
│   └── utils.ts                # Shared utilities
├── hooks/use-reveal.ts         # Intersection observer hook
├── middleware.ts               # Clerk auth middleware
└── public/                     # Static assets
shared-components/              # Radix UI wrapper package
supabase/migrations/            # 6 SQL migrations (001-006)
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next@15` / `react@19` | Framework |
| `@clerk/nextjs` | Authentication (embedded components) |
| `@supabase/supabase-js` / `@supabase/ssr` | Database client |
| `zod` | Validation |
| `react-hook-form` | Form handling |
| `recharts` | Charts/analytics |
| `qrcode` | QR code generation |
| `nanoid` | Unique ID generation |
| `shaders` | WebGL shader backgrounds |
| `sonner` | Toast notifications |
| `svix` | Clerk webhook verification |
| `cmdk` | Command palette |

---

## Database Migrations

| Migration | Purpose |
|-----------|---------|
| 001 | Core schema: users, campaigns, scans, suburbs, meta_integrations, conversions |
| 002 | Edge enhancements: slug, bridge config, meta_event_id, scan_aggregates |
| 003 | BigDataCloud precision geo: locality fields, confidence, VPN/proxy flags, localities table |
| 004 | Add `meta_pixel_id` to users table (simple setup) |
| 005 | Add `tracking_base_url` to campaigns (custom domain support) |
| 006 | Add encrypted Meta CAPI token fields to users table |

---

## Implementation Status

### Built & Working
- QR code generation (SVG + Data URL) with campaign CRUD
- Edge Runtime redirect handler (`/go/[slug]`) with bridge page
- BigDataCloud precision geolocation with Vercel fallback
- Meta CAPI event firing with deduplication (event_id)
- AES-256-GCM encryption for Meta tokens
- Clerk authentication with Supabase user sync (webhook + fallback)
- Cookie-based visitor tracking (visitor_id, campaign visits)
- Dashboard with campaign list, status filters, QR download
- Landing page with WebGL shaders, glassmorphic design
- Full database schema with RLS policies

### Not Yet Implemented
- Analytics dashboard (heat maps, time series, geographic filtering)
- Meta OAuth flow (currently manual pixel ID entry only)
- Campaign attribution (linking QR scans to Meta ad spend/ROI)
- Custom domains (CNAME support, SSL)
- Billing & plans (Stripe)
- A/B testing, dynamic destinations, webhook integrations
