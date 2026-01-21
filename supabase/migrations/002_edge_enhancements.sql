-- Migration 002: Edge Architecture Enhancements
-- Adds support for Meta CAPI, bridge page configuration, and custom domains

-- ============================================================================
-- 1. SCANS TABLE ENHANCEMENTS
-- ============================================================================

-- Add meta_event_id for CAPI deduplication (matches client-side pixel event_id)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS meta_event_id VARCHAR(32);
CREATE INDEX IF NOT EXISTS idx_scans_meta_event_id ON scans(meta_event_id);

-- Add postcode for precise suburb matching
ALTER TABLE scans ADD COLUMN IF NOT EXISTS postcode VARCHAR(10);
CREATE INDEX IF NOT EXISTS idx_scans_postcode ON scans(postcode);

-- ============================================================================
-- 2. META INTEGRATIONS - TOKEN ENCRYPTION
-- ============================================================================

-- Add encrypted token storage (AES-256)
ALTER TABLE meta_integrations ADD COLUMN IF NOT EXISTS encrypted_access_token TEXT;
ALTER TABLE meta_integrations ADD COLUMN IF NOT EXISTS encryption_iv VARCHAR(32);
ALTER TABLE meta_integrations ADD COLUMN IF NOT EXISTS encryption_version INTEGER DEFAULT 1;

-- ============================================================================
-- 3. CAMPAIGNS - BRIDGE PAGE CONFIGURATION
-- ============================================================================

-- Bridge page settings
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bridge_enabled BOOLEAN DEFAULT true;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bridge_duration_ms INTEGER DEFAULT 800;

-- Custom domain support for reputation sandboxing
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);

-- Slug for /go/[slug] routes (more user-friendly than tracking_code)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS slug VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug) WHERE slug IS NOT NULL;

-- ============================================================================
-- 4. USERS - DOMAIN TIER
-- ============================================================================

-- Domain tier: 'shared' (uses link-track.me pool) or 'custom' (own CNAME)
ALTER TABLE users ADD COLUMN IF NOT EXISTS domain_tier VARCHAR(20) DEFAULT 'shared';

-- Custom domain verified status
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ;

-- ============================================================================
-- 5. SUBURBS TABLE - ENHANCED FOR POSTCODE LOOKUP
-- ============================================================================

-- Ensure suburbs table has proper indexes for postcode lookup
CREATE INDEX IF NOT EXISTS idx_suburbs_postcode_lookup ON suburbs(postcode);

-- Add locality type for better suburb classification
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS locality_type VARCHAR(50);
-- locality_type: 'suburb', 'town', 'city', 'rural'

-- Add population for priority sorting (larger suburbs first)
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS population INTEGER;

-- ============================================================================
-- 6. HELPER FUNCTION: Get suburb by postcode
-- ============================================================================

CREATE OR REPLACE FUNCTION get_suburb_by_postcode(p_postcode VARCHAR)
RETURNS TABLE(
  suburb_name VARCHAR,
  suburb_state VARCHAR,
  suburb_latitude DECIMAL,
  suburb_longitude DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.name,
    s.state,
    s.latitude,
    s.longitude
  FROM suburbs s
  WHERE s.postcode = p_postcode
  ORDER BY s.population DESC NULLS LAST, s.name ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. SCAN AGGREGATION TRIGGER
-- ============================================================================

-- Function to update scan_aggregates when a scan is inserted
CREATE OR REPLACE FUNCTION update_scan_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  scan_date DATE;
  scan_hour INTEGER;
BEGIN
  scan_date := DATE(NEW.scanned_at);
  scan_hour := EXTRACT(HOUR FROM NEW.scanned_at);

  INSERT INTO scan_aggregates (
    campaign_id,
    date,
    hour,
    suburb,
    postcode,
    state,
    total_scans,
    unique_visitors,
    mobile_scans,
    desktop_scans,
    tablet_scans
  )
  VALUES (
    NEW.campaign_id,
    scan_date,
    scan_hour,
    NEW.suburb,
    NEW.postcode,
    NEW.state,
    1,
    CASE WHEN NEW.is_first_scan THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END
  )
  ON CONFLICT (campaign_id, date, hour, suburb, postcode, state)
  DO UPDATE SET
    total_scans = scan_aggregates.total_scans + 1,
    unique_visitors = scan_aggregates.unique_visitors + CASE WHEN NEW.is_first_scan THEN 1 ELSE 0 END,
    mobile_scans = scan_aggregates.mobile_scans + CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    desktop_scans = scan_aggregates.desktop_scans + CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    tablet_scans = scan_aggregates.tablet_scans + CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic aggregation
DROP TRIGGER IF EXISTS trigger_update_scan_aggregates ON scans;
CREATE TRIGGER trigger_update_scan_aggregates
  AFTER INSERT ON scans
  FOR EACH ROW
  EXECUTE FUNCTION update_scan_aggregates();

-- ============================================================================
-- 8. ADD UNIQUE CONSTRAINT FOR AGGREGATES (for upsert)
-- ============================================================================

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'scan_aggregates_unique_key'
  ) THEN
    ALTER TABLE scan_aggregates
    ADD CONSTRAINT scan_aggregates_unique_key
    UNIQUE (campaign_id, date, hour, suburb, postcode, state);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================================
-- 9. RLS POLICIES FOR NEW COLUMNS
-- ============================================================================

-- No new RLS policies needed - existing campaign/user policies cover new columns

-- ============================================================================
-- 10. BACKFILL: Generate slugs for existing campaigns
-- ============================================================================

-- Update existing campaigns to have slugs based on tracking_code
UPDATE campaigns
SET slug = tracking_code
WHERE slug IS NULL AND tracking_code IS NOT NULL;
