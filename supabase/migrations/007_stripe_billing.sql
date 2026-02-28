-- Migration: Stripe Metered Billing
-- Adds billing infrastructure for pay-per-scan metered billing

-- 1. Add billing columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS billing_active BOOLEAN DEFAULT FALSE;

-- Index for fast Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
  ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- 2. Billing subscriptions table
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_user_id
  ON billing_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_stripe_sub_id
  ON billing_subscriptions (stripe_subscription_id);

-- RLS for billing_subscriptions
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON billing_subscriptions FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

-- 3. Scan usage events table (reliability queue)
CREATE TABLE IF NOT EXISTS scan_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'dead_letter')),
  quantity INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  stripe_event_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Index for retry queries: find pending/failed events efficiently
CREATE INDEX IF NOT EXISTS idx_scan_usage_events_retry
  ON scan_usage_events (status, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_scan_usage_events_user_period
  ON scan_usage_events (user_id, created_at);

-- RLS for scan_usage_events
ALTER TABLE scan_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage events"
  ON scan_usage_events FOR SELECT
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

-- 4. Helper function: count scans in current billing period
CREATE OR REPLACE FUNCTION get_user_period_scan_count(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ
) RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM scan_usage_events
  WHERE user_id = p_user_id
    AND created_at >= p_period_start
    AND status != 'dead_letter';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
