# Free Real Estate - Project Summary

> A QR code tracking and analytics platform for real estate marketing campaigns.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Authentication Architecture](#authentication-architecture)
- [Database Schema](#database-schema)
- [Implemented Features](#implemented-features)
- [Planned Features](#planned-features)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Setup Instructions](#setup-instructions)
- [Recent Changes Log](#recent-changes-log)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Glassmorphic UI design |
| UI Components | Radix UI, shared-components package |
| Authentication | Clerk (embedded components) |
| Database | Supabase (PostgreSQL with RLS) |
| Visuals | Custom WebGL shaders (shaders/react package) |
| Icons | Lucide React |
| QR Codes | qrcode.react |

---

## Project Structure

```
Free Real Estate/
├── frontend/                    # Next.js 15 application
│   ├── app/
│   │   ├── (marketing)/         # Public pages (landing)
│   │   ├── dashboard/           # Protected dashboard route
│   │   ├── login/[[...sign-in]]/  # Clerk SignIn (catch-all)
│   │   ├── signup/[[...sign-up]]/ # Clerk SignUp (catch-all)
│   │   ├── q/[shortCode]/       # QR code bridge pages
│   │   ├── api/
│   │   │   ├── webhooks/clerk/  # Clerk user sync webhook
│   │   │   ├── q/[shortCode]/   # QR code lookup API
│   │   │   ├── scans/           # Scan recording API
│   │   │   └── qr-codes/        # QR code CRUD API
│   │   ├── globals.css          # Global styles + Clerk overrides
│   │   ├── layout.tsx           # Root layout with ClerkProvider
│   │   └── middleware.ts        # Route protection
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── crm-dashboard.tsx    # Main dashboard layout
│   │   │   └── qr-code-generator.tsx # QR code creation UI
│   │   └── grain-overlay.tsx    # Visual grain effect
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts        # Browser client with JWT injection
│   │       └── server.ts        # Server-side client
│   └── .env.local               # Environment variables
├── supabase/
│   └── migrations/
│       └── 001_qr_tracking_schema.sql  # Database schema
├── shared-components/           # Shared UI component library
├── shaders/                     # WebGL shader effects package
└── CLAUDE.md                    # Project guidelines for AI
```

---

## Authentication Architecture

### Clerk + Supabase Integration (JWKS/Third-Party Auth)

This project uses the **modern JWKS approach** (not the deprecated HS256 JWT secret method).

#### How It Works

1. **User authenticates via Clerk** (Google OAuth, email, etc.)
2. **Clerk issues a JWT** signed with their private key
3. **Supabase verifies the JWT** using Clerk's public JWKS endpoint
4. **RLS policies** use `requesting_user_id()` function to extract the Clerk user ID from the JWT

#### Key Components

**SQL Helper Function** (`supabase/migrations/001_qr_tracking_schema.sql`):
```sql
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;
```

**Supabase Client with JWT Injection** (`frontend/lib/supabase/client.ts`):
```typescript
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
          return fetch(url, { ...options, headers })
        },
      },
    }
  )
}
```

**Clerk Webhook for User Sync** (`frontend/app/api/webhooks/clerk/route.ts`):
- Handles `user.created`, `user.updated`, `user.deleted` events
- Syncs Clerk users to `users` table in Supabase
- Uses `svix` for webhook signature verification

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Stores user data synced from Clerk |
| `campaigns` | Marketing campaigns (one user has many campaigns) |
| `qr_codes` | QR codes linked to campaigns |
| `scans` | Scan events with geolocation and device data |
| `suburbs` | Australian suburbs for heat map visualization |
| `scan_locations` | Aggregated scan counts per suburb |

### Key Relationships

```
users (1) ──── (*) campaigns (1) ──── (*) qr_codes (1) ──── (*) scans
                                              │
                                              └──── (*) scan_locations ──── (1) suburbs
```

### Row Level Security (RLS)

All tables have RLS enabled. Policies use `requesting_user_id()` to ensure users can only access their own data:

```sql
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));
```

---

## Implemented Features

### 1. Authentication Flow
- [x] Clerk embedded SignIn/SignUp components
- [x] Glassmorphic styling matching app design
- [x] Catch-all routes for multi-step auth flows
- [x] Dashboard logout functionality
- [x] Protected routes via middleware

### 2. QR Code Generator
- [x] Create QR codes with custom destination URLs
- [x] Generate short codes for tracking
- [x] Download QR codes as PNG/SVG
- [x] List view of created QR codes
- [x] Copy tracking URL functionality

### 3. Dashboard Layout
- [x] Glassmorphic card-based UI
- [x] WebGL shader backgrounds (Swirl + ChromaFlow)
- [x] Grain overlay effect
- [x] Responsive sidebar navigation
- [x] Tab-based content switching

### 4. QR Code Scanning Infrastructure
- [x] Bridge pages at `/q/[shortCode]`
- [x] Scan recording API (`/api/scans`)
- [x] Device detection (user agent parsing)
- [x] IP-based geolocation ready

---

## Planned Features

### Heat Map (Coming Soon)
- Visualize scan locations on interactive map
- Aggregate scans by suburb
- Color-coded density display
- Requires: `suburbs` and `scan_locations` tables (schema ready)

### Meta Campaigns (Coming Soon)
- Connect Meta (Facebook/Instagram) ad accounts
- Track attribution between QR scans and ad conversions
- UTM parameter passthrough
- Conversion pixel integration

### Settings Page (Coming Soon)
- Account configuration
- Meta integration setup
- Subscription management
- API key management

---

## API Endpoints

### Public Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/q/[shortCode]` | Lookup QR code destination |
| POST | `/api/scans` | Record a scan event |
| POST | `/api/webhooks/clerk` | Clerk webhook receiver |

### Protected Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/qr-codes` | List user's QR codes |
| POST | `/api/qr-codes` | Create new QR code |
| DELETE | `/api/qr-codes/[id]` | Delete a QR code |

---

## Environment Variables

Required in `frontend/.env.local`:

```env
# Supabase (new key naming convention)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

---

## Setup Instructions

### 1. Supabase Configuration

1. Create a new Supabase project
2. Run the migration in `supabase/migrations/001_qr_tracking_schema.sql`
3. Enable third-party auth in Supabase Dashboard:
   - Go to **Project Settings > API > Auth**
   - Enable **Third-party Auth**
   - Add Clerk's JWKS URL: `https://<your-clerk-domain>/.well-known/jwks.json`

### 2. Clerk Configuration

1. Create a Clerk application
2. Configure OAuth providers (Google, etc.)
3. Set up webhook:
   - Go to **Webhooks** in Clerk Dashboard
   - Add endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret to `CLERK_WEBHOOK_SECRET`

### 3. Local Development

```bash
cd frontend
npm install
npm run dev
```

---

## Recent Changes Log

### Session: January 2026

#### Database & Authentication
- Fixed SQL migration order (users table must exist before campaigns)
- Implemented Clerk + Supabase JWKS integration (modern approach)
- Created `requesting_user_id()` helper function for RLS
- Updated all RLS policies to use new helper function
- Created Clerk webhook for user synchronization
- Updated environment variables for new Supabase API key naming

#### UI/UX Improvements
- Replaced custom login form with Clerk embedded `<SignIn />` component
- Created matching `/signup` page with `<SignUp />` component
- Converted to catch-all routes for multi-step auth flows
- Applied glassmorphic styling to Clerk components:
  - Transparent card background with blur
  - White text on all elements
  - Styled social buttons, inputs, badges
  - Fixed "Secured by Clerk" dev banner styling
- Added logout functionality to dashboard sidebar
- Reorganized sidebar navigation (moved Support/Logout under Administration)

#### Bug Fixes
- Fixed "relation 'users' does not exist" error
- Fixed Clerk SignIn "not configured correctly" error
- Fixed inverted social button icons (Google, etc.)
- Fixed white areas in Clerk card
- Fixed "Last used" badge transparency
- Fixed "Secured by Clerk" banner reverting to white

---

## Notes for Future Development

### Glassmorphic Design System

The app uses a consistent glassmorphic design with these values:

```css
/* Glass Card */
background: rgba(255, 255, 255, 0.25);
backdrop-filter: blur(24px);
border: 1px solid rgba(255, 255, 255, 0.35);
border-radius: 1.5rem;

/* Glass Button */
background: rgba(255, 255, 255, 0.15);
border: 1px solid rgba(255, 255, 255, 0.3);

/* Glass Button Active */
background: rgba(255, 255, 255, 0.25);
```

### Clerk Component Overrides

Clerk component styling is done via CSS in `globals.css` using `.cl-*` class selectors. Key classes:
- `.cl-card` - Main card container
- `.cl-formFieldInput` - Form inputs
- `.cl-formButtonPrimary` - Submit button
- `.cl-socialButtonsBlockButton` - OAuth buttons
- `.cl-badge` - "Last used" and similar badges

### WebGL Shaders

The app uses custom WebGL shaders from the `shaders/react` package:
- `<Swirl>` - Creates flowing color gradients
- `<ChromaFlow>` - Adds mouse-reactive color effects

Both are wrapped in a `<Shader>` component and require canvas readiness detection before displaying content.
