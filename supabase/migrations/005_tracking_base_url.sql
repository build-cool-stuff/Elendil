-- Migration: Add tracking_base_url to campaigns
-- Purpose: Remove dependency on hardcoded NEXT_PUBLIC_APP_URL
-- Each campaign stores its own tracking base URL for QR codes

-- Add tracking_base_url column to campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tracking_base_url VARCHAR(512);

-- Add tracking_url_source to track how the URL was determined
-- 'auto' = captured from request origin at creation time
-- 'custom' = user-specified custom domain
-- 'migration' = backfilled during migration
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS tracking_url_source VARCHAR(20) DEFAULT 'auto';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_tracking_base_url ON campaigns(tracking_base_url);

-- Backfill existing campaigns
-- Priority: custom_domain if set, otherwise leave NULL (will use request origin at display time)
UPDATE campaigns
SET
  tracking_base_url = CASE
    WHEN custom_domain IS NOT NULL AND custom_domain != ''
    THEN 'https://' || custom_domain
    ELSE NULL
  END,
  tracking_url_source = CASE
    WHEN custom_domain IS NOT NULL AND custom_domain != ''
    THEN 'custom'
    ELSE 'migration'
  END
WHERE tracking_base_url IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN campaigns.tracking_base_url IS 'Base URL for QR code tracking links (e.g., https://example.com). Captured at campaign creation.';
COMMENT ON COLUMN campaigns.tracking_url_source IS 'How tracking_base_url was determined: auto (request origin), custom (user-specified), migration (backfilled)';
