-- ============================================
-- Migration 012: Enable RLS on suburbs table
-- Fixes: rls_disabled_in_public — suburbs table was publicly accessible
-- ============================================

-- Enable RLS
ALTER TABLE suburbs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read suburbs (geo lookups in dashboard)
CREATE POLICY "Authenticated users can read suburbs"
  ON suburbs FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon role to read suburbs (Edge runtime uses service role, but safe fallback)
CREATE POLICY "Public can read suburbs"
  ON suburbs FOR SELECT
  TO anon
  USING (true);
