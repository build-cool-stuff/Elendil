/**
 * setup-admin.ts — Creates admin user in Clerk + outputs env vars
 *
 * Usage:
 *   cd frontend && npx tsx scripts/setup-admin.ts
 *
 * Reads credentials from .env.local automatically.
 */

import { createClerkClient } from "@clerk/backend"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"

// ─── Load .env.local ───
const envPath = resolve(__dirname, "../.env.local")
if (!existsSync(envPath)) {
  console.error("Missing frontend/.env.local — create it first with CLERK_SECRET_KEY")
  process.exit(1)
}

const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eqIdx = trimmed.indexOf("=")
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const value = trimmed.slice(eqIdx + 1).trim()
  if (!process.env[key]) process.env[key] = value
}

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
if (!CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY not found in .env.local")
  process.exit(1)
}

// ─── Admin credentials (from env vars, with defaults for dev) ───
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@elendil.com.au"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Elendil-Admin-2026!"

async function main() {
  console.log("\n╔═══════════════════════════════╗")
  console.log("║   Elendil Admin Setup         ║")
  console.log("╚═══════════════════════════════╝\n")

  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })

  // Check if user already exists
  console.log("Checking for existing admin user...")
  const existing = await clerk.users.getUserList({ emailAddress: [ADMIN_EMAIL] })

  let userId: string

  if (existing.data.length > 0) {
    userId = existing.data[0].id
    console.log(`✓ Admin user already exists: ${userId}`)
  } else {
    console.log("Creating admin user in Clerk...")
    const user = await clerk.users.createUser({
      emailAddress: [ADMIN_EMAIL],
      password: ADMIN_PASSWORD,
      firstName: "Admin",
      lastName: "Elendil",
    })
    userId = user.id
    console.log(`✓ Admin user created: ${userId}`)
  }

  // ─── Auto-append to .env.local ───
  const linesToAdd = [
    "",
    "# Admin",
    `ADMIN_USER_ID=${userId}`,
    `NEXT_PUBLIC_ADMIN_USER_ID=${userId}`,
  ]

  // Check if already in .env.local
  if (envContent.includes("ADMIN_USER_ID")) {
    console.log("\n⚠  ADMIN_USER_ID already exists in .env.local — not overwriting.")
    console.log("   If you need to update it, edit frontend/.env.local manually.")
  } else {
    writeFileSync(envPath, envContent.trimEnd() + "\n" + linesToAdd.join("\n") + "\n")
    console.log("\n✓ Added ADMIN_USER_ID and NEXT_PUBLIC_ADMIN_USER_ID to .env.local")
  }

  // ─── Output ───
  console.log("\n┌─────────────────────────────────┐")
  console.log("│  Admin Login Credentials        │")
  console.log("├─────────────────────────────────┤")
  console.log(`│  Email:    ${ADMIN_EMAIL}  │`)
  console.log(`│  Password: ${ADMIN_PASSWORD}   │`)
  console.log("└─────────────────────────────────┘")
  console.log(`\nClerk User ID: ${userId}`)
  console.log("\nLogin at your app's /login page.")
  console.log("Admin panel will be at /admin after login.\n")
}

main().catch((err) => {
  console.error("\n✗ Setup failed:", err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err.message)
  process.exit(1)
})
