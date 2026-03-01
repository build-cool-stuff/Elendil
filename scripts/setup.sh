#!/usr/bin/env bash
set -e

# ═══════════════════════════════════════════
# Elendil — One-command admin setup
#
# Run from the repo root:
#   bash scripts/setup.sh
#
# This will:
#   1. Create your admin user in Clerk
#   2. Run the Supabase migration (010_admin_panel)
#   3. Update your .env.local with ADMIN_USER_ID
# ═══════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Elendil — Full Admin Setup          ║"
echo "╚═══════════════════════════════════════╝"
echo ""

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
MIGRATION_FILE="$REPO_ROOT/supabase/migrations/010_admin_panel.sql"

# ─── Check prereqs ───
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
  echo "✗ frontend/.env.local not found. Create it first."
  exit 1
fi

# Source env vars
set -a
while IFS= read -r line; do
  line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [[ -z "$line" || "$line" == \#* ]] && continue
  eval "export $line" 2>/dev/null || true
done < "$FRONTEND_DIR/.env.local"
set +a

if [ -z "$CLERK_SECRET_KEY" ]; then
  echo "✗ CLERK_SECRET_KEY not found in .env.local"
  exit 1
fi
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "✗ NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
  exit 1
fi

# ─── Step 1: Clerk admin user ───
echo "Step 1: Creating admin user in Clerk..."
echo "────────────────────────────────────────"
cd "$FRONTEND_DIR"
npx tsx scripts/setup-admin.ts
echo ""

# ─── Step 2: Supabase migration ───
echo "Step 2: Running Supabase migration 010..."
echo "────────────────────────────────────────"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "✗ Migration file not found at: $MIGRATION_FILE"
  exit 1
fi

# Extract project ref from URL (e.g., https://yjbpappqxqxhqhmovcei.supabase.co → yjbpappqxqxhqhmovcei)
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | sed 's|\.supabase\.co.*||')
echo "  Supabase project: $PROJECT_REF"

# Check if supabase CLI is available
if command -v supabase &>/dev/null; then
  SUPABASE_CMD="supabase"
elif npx supabase --version &>/dev/null 2>&1; then
  SUPABASE_CMD="npx supabase"
else
  echo "  Installing Supabase CLI..."
  SUPABASE_CMD="npx supabase"
fi

# Initialize supabase if needed
cd "$REPO_ROOT"
if [ ! -f "supabase/config.toml" ]; then
  echo "  Initializing Supabase project..."
  $SUPABASE_CMD init 2>/dev/null || true
fi

# Link to remote project
echo "  Linking to project $PROJECT_REF..."
echo "  (You'll be asked for your database password — find it in Supabase Dashboard > Settings > Database)"
$SUPABASE_CMD link --project-ref "$PROJECT_REF"

# Push migration
echo "  Pushing migration..."
$SUPABASE_CMD db push

echo ""
echo "✓ Migration 010 applied successfully!"
echo ""
echo "═══════════════════════════════════════"
echo "  Setup complete! You can now:"
echo "  1. cd frontend && npm run dev"
echo "  2. Go to /login"
echo "  3. Login with your admin credentials"
echo "  4. Navigate to /admin"
echo "═══════════════════════════════════════"
echo ""
