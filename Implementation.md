# Implementation Progress

## QR Campaign System - Edge Architecture

**Last Updated:** January 2026

---

## Completed Tasks

### Phase 1: Database Updates
- [x] Created `002_edge_enhancements.sql` migration
  - Added `meta_event_id` to scans table
  - Added `encrypted_access_token`, `encryption_iv`, `encryption_version` to meta_integrations
  - Added `bridge_enabled`, `bridge_duration_ms`, `slug`, `custom_domain` to campaigns
  - Added `domain_tier`, `custom_domain`, `custom_domain_verified` to users
  - Created `get_suburb_by_postcode()` function
  - Created `update_scan_aggregates()` trigger
  - Added unique constraint for scan_aggregates upsert

### Phase 2: Edge Infrastructure
- [x] `lib/edge/supabase-edge.ts` - Edge-compatible Supabase client
- [x] `lib/edge/geo.ts` - Vercel geo header extraction
- [x] `lib/edge/user-agent.ts` - Lightweight UA parser (no dependencies)
- [x] `lib/edge/cookies.ts` - Cookie utilities for Edge Response
- [x] `lib/edge/encryption.ts` - AES-256-GCM encryption with Web Crypto API
- [x] `lib/edge/meta-capi.ts` - Meta Conversions API client
- [x] `lib/edge/index.ts` - Re-export barrel file

### Phase 3: Edge Redirect Engine
- [x] `app/go/[slug]/route.ts` - Main Edge redirect handler
  - Campaign lookup by slug or tracking code
  - Geo extraction from Vercel headers
  - Suburb lookup via postcode cross-reference
  - Cookie management (visitor ID, campaign tracking)
  - Meta CAPI event firing (async)
  - Scan recording (async, non-blocking)
  - Configurable bridge page redirect

- [x] `app/go/[slug]/page.tsx` - Bridge page
  - 800ms default delay (configurable)
  - Meta Pixel client-side firing
  - Event ID deduplication
  - Animated progress UI
  - Skip link for immediate redirect

- [x] `app/api/go/[slug]/route.ts` - Bridge page data API

### Phase 4: Migration & Cleanup
- [x] Updated `middleware.ts` for `/go/` routes (public)
- [x] Updated QR code service with new route structure
- [x] Updated dashboard component to use `/go/` URLs
- [x] Updated TypeScript types for new columns

### Phase 5: Documentation & Tooling
- [x] Created `scripts/seed-suburbs.ts` - Australian suburb seeder
- [x] Created `CLAUDE.md` - Project spec for AI assistants
- [x] Updated `Implementation.md` - This file

---

## Files Created/Modified

### New Files
```
frontend/
├── lib/edge/
│   ├── index.ts
│   ├── supabase-edge.ts
│   ├── geo.ts
│   ├── user-agent.ts
│   ├── cookies.ts
│   ├── encryption.ts
│   └── meta-capi.ts
├── app/
│   ├── go/[slug]/
│   │   ├── route.ts
│   │   └── page.tsx
│   └── api/go/[slug]/
│       └── route.ts
scripts/
└── seed-suburbs.ts
supabase/migrations/
└── 002_edge_enhancements.sql
CLAUDE.md
```

### Modified Files
```
frontend/
├── middleware.ts
├── lib/
│   ├── services/qr-code.service.ts
│   └── supabase/types.ts
└── components/dashboard/qr-code-generator.tsx
```

---

## Next Steps (Manual)

### 1. Run Database Migration
```sql
-- Execute in Supabase SQL Editor
-- File: supabase/migrations/002_edge_enhancements.sql
```

### 2. Seed Suburbs Data
```bash
cd frontend
npx tsx ../scripts/seed-suburbs.ts
```

### 3. Add Environment Variables
```env
# Add to frontend/.env.local
ENCRYPTION_KEY=<generate-with-encryption.generateEncryptionKey()>
IP_HASH_SALT=<random-string>
```

### 4. Enable Supabase Third-Party Auth
1. Go to Supabase Dashboard > Project Settings > API > Auth
2. Enable "Third-party Auth"
3. Add Clerk's JWKS URL: `https://<your-clerk-domain>/.well-known/jwks.json`

### 5. Configure Clerk Webhook
1. Go to Clerk Dashboard > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`

---

## Architecture Overview

```
User scans QR code (e.g., domain.com/go/abc123)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  EDGE FUNCTION (route.ts) - ~30-50ms                        │
│                                                             │
│  1. Lookup campaign by slug/code                            │
│  2. Extract geo from Vercel headers (x-vercel-ip-postal-code)
│  3. Cross-reference postcode → suburb name                  │
│  4. Parse User-Agent (lightweight)                          │
│  5. Generate/read visitor cookie                            │
│  6. Fire Meta CAPI event (async, non-blocking)              │
│  7. Record scan to Supabase (async, non-blocking)           │
│  8. Redirect to bridge or destination                       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼ (if bridge_enabled)
┌─────────────────────────────────────────────────────────────┐
│  BRIDGE PAGE (page.tsx) - 800ms default                     │
│                                                             │
│  1. Fetch campaign data                                     │
│  2. Fire Meta Pixel (client-side)                           │
│  3. Show progress animation                                 │
│  4. Redirect to destination_url                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    Destination URL
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Edge redirect | <50ms | Direct redirect without bridge |
| Bridge page | 800ms | Configurable per campaign |
| Scan recording | Async | Non-blocking, fire-and-forget |
| Meta CAPI | Async | Non-blocking, fire-and-forget |
| Geo lookup | <10ms | Supabase indexed query |

---

## Testing Checklist

- [ ] Create new campaign from dashboard
- [ ] Verify QR code uses `/go/` URL format
- [ ] Scan QR code on mobile device
- [ ] Verify bridge page displays
- [ ] Verify redirect to destination
- [ ] Check scan recorded in Supabase
- [ ] Check Meta Events Manager for CAPI event
- [ ] Verify suburb populated from postcode
- [ ] Test pause/resume campaign functionality
- [ ] Test cookie duration (30/60/90 days)
