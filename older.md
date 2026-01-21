# Project: Unified Full-Stack App (Next.js 15 + Supabase)

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4, Lucide React.
- **UI:** Radix UI, Shadcn/ui (Shared components in `/components/ui`).
- **Backend/Auth:** Supabase (Auth, PostgreSQL, Storage).
- **Validation:** Zod + React Hook Form.

## Architecture Guidelines
- **Unified App:** All features live in one Next.js project.
- **Route Groups:** Use `(marketing)` for public pages and `(dashboard)` for protected pages.
- **Auth Flow:** Use Supabase SSR for cookie-based authentication.
- **Server Actions:** All database mutations (create, update, delete) must happen via Next.js Server Actions.

## Database & Schema (Supabase)
- **SQL-First:** When generating new features, always provide the SQL migration script for the Supabase SQL Editor first.
- **Types:** Use `supabase gen types` or reference existing types in `/types/supabase.ts`.

## Code Style
- **Components:** Default to Server Components. Use `"use client"` only when browser interactivity (hooks, event listeners) is required.
- **Naming:** PascalCase for components, kebab-case for directories.
- **Safety:** Always validate form data with Zod before calling Server Actions.

## Commands
- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`