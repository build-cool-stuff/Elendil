-- Migration 003: BigDataCloud Precision Geolocation
-- Adds support for suburb-level precision using Network Topology Geolocation
-- Standard IP lookups are postcode-level (one postcode = 5+ suburbs)
-- BigDataCloud provides confidence area polygons for ISP Exchange precision

-- ============================================================================
-- 1. SCANS TABLE - Enhanced Geo Columns
-- ============================================================================

-- Primary location (from BigDataCloud)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS locality_name VARCHAR(255);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Precision metrics
ALTER TABLE scans ADD COLUMN IF NOT EXISTS confidence_radius_km DECIMAL(10, 3);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS geo_source VARCHAR(20) DEFAULT 'vercel';
-- geo_source: 'bigdatacloud' | 'vercel' | 'fallback'

-- Network information
ALTER TABLE scans ADD COLUMN IF NOT EXISTS isp_name VARCHAR(255);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS network_type VARCHAR(50);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);

-- Security flags
ALTER TABLE scans ADD COLUMN IF NOT EXISTS is_vpn BOOLEAN DEFAULT false;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS is_proxy BOOLEAN DEFAULT false;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS is_tor BOOLEAN DEFAULT false;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scans_locality_name ON scans(locality_name);
CREATE INDEX IF NOT EXISTS idx_scans_confidence ON scans(confidence_radius_km);
CREATE INDEX IF NOT EXISTS idx_scans_geo_source ON scans(geo_source);
CREATE INDEX IF NOT EXISTS idx_scans_is_vpn ON scans(is_vpn) WHERE is_vpn = true;

-- ============================================================================
-- 2. LOCALITIES TABLE - For Cross-Reference & Normalization
-- ============================================================================

CREATE TABLE IF NOT EXISTS localities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location identifiers
  locality_name VARCHAR(255) NOT NULL,
  city VARCHAR(255),
  postcode VARCHAR(10),
  state VARCHAR(100),
  state_code VARCHAR(10),
  country VARCHAR(100) DEFAULT 'Australia',
  country_code VARCHAR(2) DEFAULT 'AU',

  -- Coordinates (centroid)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Metadata
  population INTEGER,
  area_sqkm DECIMAL(10, 2),
  locality_type VARCHAR(50), -- suburb, town, city, rural

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT localities_unique UNIQUE (locality_name, postcode, state_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_localities_name ON localities(locality_name);
CREATE INDEX IF NOT EXISTS idx_localities_postcode ON localities(postcode);
CREATE INDEX IF NOT EXISTS idx_localities_state ON localities(state_code);

-- ============================================================================
-- 3. SCAN_AGGREGATES - Add Locality Dimension
-- ============================================================================

-- Add locality_name for more granular aggregation
ALTER TABLE scan_aggregates ADD COLUMN IF NOT EXISTS locality_name VARCHAR(255);
ALTER TABLE scan_aggregates ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20);
-- confidence_level: 'high' (<1km), 'medium' (1-5km), 'low' (5-20km), 'unreliable' (>20km)

-- Update unique constraint to include locality_name
-- First drop the old constraint if it exists
ALTER TABLE scan_aggregates DROP CONSTRAINT IF EXISTS scan_aggregates_unique_key;

-- Set default values for the aggregate columns to avoid NULL issues in UNIQUE constraint
-- NULLs are considered distinct in PostgreSQL UNIQUE constraints
ALTER TABLE scan_aggregates ALTER COLUMN locality_name SET DEFAULT '';
ALTER TABLE scan_aggregates ALTER COLUMN postcode SET DEFAULT '';
ALTER TABLE scan_aggregates ALTER COLUMN state SET DEFAULT '';

-- Create new constraint with locality_name (values will never be NULL due to trigger logic)
ALTER TABLE scan_aggregates
ADD CONSTRAINT scan_aggregates_unique_key
UNIQUE (campaign_id, date, hour, locality_name, postcode, state);

-- ============================================================================
-- 4. HELPER FUNCTION: Get Confidence Level
-- ============================================================================

CREATE OR REPLACE FUNCTION get_confidence_level(radius_km DECIMAL)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF radius_km IS NULL THEN
    RETURN 'unreliable';
  ELSIF radius_km < 1 THEN
    RETURN 'high';
  ELSIF radius_km < 5 THEN
    RETURN 'medium';
  ELSIF radius_km < 20 THEN
    RETURN 'low';
  ELSE
    RETURN 'unreliable';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 5. UPDATE AGGREGATION TRIGGER - Use locality_name
-- ============================================================================

CREATE OR REPLACE FUNCTION update_scan_aggregates()
RETURNS TRIGGER AS $$
DECLARE
  scan_date DATE;
  scan_hour INTEGER;
  conf_level VARCHAR(20);
BEGIN
  scan_date := DATE(NEW.scanned_at);
  scan_hour := EXTRACT(HOUR FROM NEW.scanned_at);
  conf_level := get_confidence_level(NEW.confidence_radius_km);

  INSERT INTO scan_aggregates (
    campaign_id,
    date,
    hour,
    locality_name,
    suburb,
    postcode,
    state,
    confidence_level,
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
    COALESCE(NEW.locality_name, ''), -- Use empty string for NULL to match UNIQUE constraint
    COALESCE(NEW.locality_name, NEW.suburb, ''), -- Use locality_name as suburb fallback
    COALESCE(NEW.postcode, ''), -- Use empty string for NULL
    COALESCE(NEW.state_code, NEW.state, ''), -- Use empty string for NULL
    conf_level,
    1,
    CASE WHEN NEW.is_first_scan THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END
  )
  ON CONFLICT (campaign_id, date, hour, locality_name, postcode, state)
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_scan_aggregates ON scans;
CREATE TRIGGER trigger_update_scan_aggregates
  AFTER INSERT ON scans
  FOR EACH ROW
  EXECUTE FUNCTION update_scan_aggregates();

-- ============================================================================
-- 6. VIEW: Scans with Confidence Level
-- ============================================================================

CREATE OR REPLACE VIEW scans_with_confidence AS
SELECT
  s.*,
  get_confidence_level(s.confidence_radius_km) AS confidence_level,
  CASE
    WHEN s.geo_source = 'bigdatacloud' AND s.confidence_radius_km < 5 THEN true
    ELSE false
  END AS is_precise_location
FROM scans s;

-- ============================================================================
-- 7. VIEW: Campaign Location Stats
-- ============================================================================

CREATE OR REPLACE VIEW campaign_location_stats AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.user_id,
  COUNT(s.id) AS total_scans,
  COUNT(DISTINCT s.visitor_id) AS unique_visitors,
  COUNT(DISTINCT s.locality_name) AS unique_localities,
  COUNT(DISTINCT s.postcode) AS unique_postcodes,
  AVG(s.confidence_radius_km) AS avg_confidence_km,
  COUNT(CASE WHEN get_confidence_level(s.confidence_radius_km) = 'high' THEN 1 END) AS high_confidence_scans,
  COUNT(CASE WHEN s.is_vpn = true THEN 1 END) AS vpn_scans,
  ARRAY_AGG(DISTINCT s.locality_name) FILTER (WHERE s.locality_name IS NOT NULL) AS localities
FROM campaigns c
LEFT JOIN scans s ON c.id = s.campaign_id
GROUP BY c.id, c.name, c.user_id;

-- ============================================================================
-- 8. RLS Policies for localities table
-- ============================================================================

ALTER TABLE localities ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Localities are publicly readable"
  ON localities FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Only admins can modify localities"
  ON localities FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
