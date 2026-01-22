-- Migration: Add meta_pixel_id to users table
-- This allows users to set their Meta Pixel ID directly in Settings,
-- which will be fired on every QR code scan they create.

-- Add meta_pixel_id column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS meta_pixel_id VARCHAR(20) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.meta_pixel_id IS 'Meta Pixel ID for tracking QR code scans. Set via Settings page.';

-- Create index for faster lookups when joining campaigns to users
CREATE INDEX IF NOT EXISTS idx_users_meta_pixel_id ON public.users(meta_pixel_id) WHERE meta_pixel_id IS NOT NULL;
