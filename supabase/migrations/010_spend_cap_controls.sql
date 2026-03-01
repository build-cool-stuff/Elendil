-- Migration 010: Spend Cap Controls (On/Off Toggle + Adjustable Amount)
--
-- Adds per-user spend cap configuration:
-- - spend_cap_enabled: binary on/off switch for spend cap enforcement
-- - spend_cap_amount_aud: the dollar threshold at which premium features degrade
--
-- When spend_cap_enabled = true AND accrued spend >= spend_cap_amount_aud,
-- the Edge redirect handler degrades the user to basic mode (no bridge,
-- no CAPI, no BigDataCloud geo, no suburb lookup).
--
-- When spend_cap_enabled = false, premium features continue regardless
-- of spend. The user accepts unlimited charges at $20 AUD per first scan.
--
-- Default: enabled at $5,000 AUD (preserves existing behavior).

-- ============================================================================
-- 1. USERS TABLE - Spend Cap Control Columns
-- ============================================================================

-- Master switch: when false, the spend cap is not enforced and scans
-- continue receiving premium features with no upper spend limit.
ALTER TABLE users ADD COLUMN IF NOT EXISTS spend_cap_enabled BOOLEAN NOT NULL DEFAULT true;

-- The dollar amount at which premium features degrade. Only checked
-- when spend_cap_enabled is true. Minimum $100, no maximum.
ALTER TABLE users ADD COLUMN IF NOT EXISTS spend_cap_amount_aud NUMERIC(10,2) NOT NULL DEFAULT 5000.00;

-- ============================================================================
-- 2. CONSTRAINT - Minimum spend cap amount ($100 AUD)
-- ============================================================================

-- Prevent absurdly low caps that would degrade after just a few scans.
-- $100 = 5 first scans at $20/scan. This is a floor, not a ceiling.
ALTER TABLE users ADD CONSTRAINT chk_spend_cap_amount_minimum
  CHECK (spend_cap_amount_aud >= 100);
