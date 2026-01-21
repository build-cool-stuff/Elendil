-- QR Code Tracking SaaS Schema
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- CLERK JWKS HELPER FUNCTION
-- Extracts the Clerk User ID from JWT claims
-- ============================================
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;

-- Helper to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
  SELECT requesting_user_id() IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- USERS TABLE
-- Stores user profiles linked to Clerk Auth
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- CAMPAIGNS TABLE
-- Stores QR code campaigns created by agents
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  destination_url TEXT NOT NULL,
  tracking_code VARCHAR(32) UNIQUE NOT NULL,
  cookie_duration_days INTEGER NOT NULL DEFAULT 30,
  qr_code_svg TEXT,
  qr_code_data_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_cookie_duration CHECK (cookie_duration_days IN (30, 60, 90)),
  CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_tracking_code ON campaigns(tracking_code);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ============================================
-- SCANS TABLE
-- Records every QR code scan event
-- ============================================
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  visitor_id VARCHAR(64) NOT NULL,
  ip_address_hash VARCHAR(64),

  -- Geolocation data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  suburb VARCHAR(255),
  postcode VARCHAR(10),
  state VARCHAR(50),
  country VARCHAR(100) DEFAULT 'Australia',

  -- Device/context data
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  referrer TEXT,

  -- Timing
  scanned_at TIMESTAMPTZ DEFAULT NOW(),

  -- Cookie tracking
  cookie_expires_at TIMESTAMPTZ,
  is_first_scan BOOLEAN DEFAULT TRUE,

  CONSTRAINT valid_device_type CHECK (device_type IN ('mobile', 'tablet', 'desktop') OR device_type IS NULL),
  CONSTRAINT valid_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
  )
);

CREATE INDEX IF NOT EXISTS idx_scans_campaign_id ON scans(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scans_suburb ON scans(suburb);
CREATE INDEX IF NOT EXISTS idx_scans_postcode ON scans(postcode);
CREATE INDEX IF NOT EXISTS idx_scans_visitor_id ON scans(visitor_id);

-- ============================================
-- SUBURBS TABLE
-- Australian suburb data for heat map
-- ============================================
CREATE TABLE IF NOT EXISTS suburbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  postcode VARCHAR(10) NOT NULL,
  state VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(name, postcode, state)
);

CREATE INDEX IF NOT EXISTS idx_suburbs_postcode ON suburbs(postcode);
CREATE INDEX IF NOT EXISTS idx_suburbs_state ON suburbs(state);
CREATE INDEX IF NOT EXISTS idx_suburbs_name ON suburbs(name);

-- ============================================
-- META_INTEGRATIONS TABLE
-- Stores Meta (Facebook) API credentials per user
-- ============================================
CREATE TABLE IF NOT EXISTS meta_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meta_user_id VARCHAR(100),
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  ad_account_id VARCHAR(100),
  pixel_id VARCHAR(100),
  business_id VARCHAR(100),
  permissions JSONB,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id),
  CONSTRAINT valid_meta_status CHECK (status IN ('active', 'expired', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_meta_integrations_user_id ON meta_integrations(user_id);

-- ============================================
-- META_CAMPAIGNS TABLE
-- Links Meta ad campaigns to QR campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS meta_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  meta_campaign_id VARCHAR(100) NOT NULL,
  meta_campaign_name VARCHAR(255),
  meta_adset_id VARCHAR(100),
  meta_ad_id VARCHAR(100),
  objective VARCHAR(100),
  status VARCHAR(50),
  spend DECIMAL(12, 2),
  impressions BIGINT,
  clicks BIGINT,
  reach BIGINT,
  date_start DATE,
  date_stop DATE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(meta_campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_user_id ON meta_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_campaign_id ON meta_campaigns(campaign_id);

-- ============================================
-- CONVERSIONS TABLE
-- Tracks attribution between QR scans and Meta ads
-- ============================================
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  meta_campaign_id UUID REFERENCES meta_campaigns(id) ON DELETE SET NULL,

  conversion_type VARCHAR(50) NOT NULL,
  conversion_value DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'AUD',

  attribution_window_days INTEGER,
  days_to_conversion INTEGER,

  converted_at TIMESTAMPTZ DEFAULT NOW(),
  scan_at TIMESTAMPTZ,

  meta_event_id VARCHAR(100),
  meta_event_name VARCHAR(100),

  CONSTRAINT valid_conversion_type CHECK (conversion_type IN ('view', 'click', 'lead', 'purchase'))
);

CREATE INDEX IF NOT EXISTS idx_conversions_user_id ON conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_campaign_id ON conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversions_converted_at ON conversions(converted_at);

-- ============================================
-- SCAN_AGGREGATES TABLE
-- Pre-computed aggregations for heat map performance
-- ============================================
CREATE TABLE IF NOT EXISTS scan_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour INTEGER,

  suburb VARCHAR(255),
  postcode VARCHAR(10),
  state VARCHAR(50),

  total_scans INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  mobile_scans INTEGER DEFAULT 0,
  desktop_scans INTEGER DEFAULT 0,
  tablet_scans INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, date, hour, suburb, postcode)
);

CREATE INDEX IF NOT EXISTS idx_scan_aggregates_campaign_date ON scan_aggregates(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_scan_aggregates_location ON scan_aggregates(suburb, postcode);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_aggregates ENABLE ROW LEVEL SECURITY;

-- Users: Enable RLS and allow users to manage their own profile
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  TO authenticated
  USING (clerk_id = requesting_user_id());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  TO authenticated
  USING (clerk_id = requesting_user_id());

-- Campaigns: Users can only access their own campaigns
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

CREATE POLICY "Users can insert own campaigns" ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

CREATE POLICY "Users can update own campaigns" ON campaigns
  FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

CREATE POLICY "Users can delete own campaigns" ON campaigns
  FOR DELETE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

-- Scans: Users can view scans for their campaigns (no insert/update/delete from client)
CREATE POLICY "Users can view scans for own campaigns" ON scans
  FOR SELECT
  TO authenticated
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = requesting_user_id()
    )
  ));

-- Service role can insert scans (for the tracking endpoint)
CREATE POLICY "Service role can insert scans" ON scans
  FOR INSERT
  WITH CHECK (true);

-- Similar policies for other tables...
CREATE POLICY "Users can manage own meta_integrations" ON meta_integrations
  FOR ALL
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

CREATE POLICY "Users can view own meta_campaigns" ON meta_campaigns
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

CREATE POLICY "Users can view own conversions" ON conversions
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = requesting_user_id()
  ));

CREATE POLICY "Users can view own scan_aggregates" ON scan_aggregates
  FOR SELECT
  TO authenticated
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = requesting_user_id()
    )
  ));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_integrations_updated_at
  BEFORE UPDATE ON meta_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scan_aggregates_updated_at
  BEFORE UPDATE ON scan_aggregates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- NOTE: USER CREATION WITH CLERK
-- ============================================
-- With Clerk authentication, users are created via:
-- 1. Clerk webhook (user.created event) -> calls your API route
-- 2. Or on first login in your app via Server Action
--
-- Example insert for new Clerk user:
-- INSERT INTO users (clerk_id, email, full_name, avatar_url)
-- VALUES ('user_xxx', 'email@example.com', 'John Doe', 'https://...');
