-- Migration 009: Billing Grace Period & Degradation Tracking
-- Adds grace period support for payment failures and degraded-since
-- tracking for missed leads counter.

-- ============================================================================
-- 1. USERS TABLE - Grace Period & Degradation Columns
-- ============================================================================

-- Set on first payment failure (now + 24h). Premium features continue
-- until this timestamp. Cleared when payment succeeds.
ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

-- Set when grace period expires or subscription is voluntarily canceled.
-- Used to count "missed leads" (scans while degraded). Cleared on reactivation.
ALTER TABLE users ADD COLUMN IF NOT EXISTS degraded_since TIMESTAMPTZ;

-- Index for cron job that enforces grace period expiry
CREATE INDEX IF NOT EXISTS idx_users_grace_period_end
  ON users (grace_period_end) WHERE grace_period_end IS NOT NULL;

-- Index for missed leads queries
CREATE INDEX IF NOT EXISTS idx_users_degraded_since
  ON users (degraded_since) WHERE degraded_since IS NOT NULL;
