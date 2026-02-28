-- Migration: Remove per-user scan cap, replace with global $5000 AUD spend threshold
-- The spend cap is now a code-level constant ($5000 AUD = 250 scans × $20/scan)
-- No per-user configuration needed

ALTER TABLE users
  DROP COLUMN IF EXISTS monthly_scan_limit,
  DROP COLUMN IF EXISTS cap_override;
