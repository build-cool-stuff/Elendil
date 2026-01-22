-- Migration: Add Meta CAPI access token fields to users

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS meta_encrypted_access_token TEXT,
  ADD COLUMN IF NOT EXISTS meta_encryption_iv VARCHAR(32),
  ADD COLUMN IF NOT EXISTS meta_encryption_version INTEGER DEFAULT 1;

COMMENT ON COLUMN public.users.meta_encrypted_access_token IS 'Encrypted Meta CAPI access token (AES-256-GCM).';
COMMENT ON COLUMN public.users.meta_encryption_iv IS 'IV for Meta CAPI token encryption.';
COMMENT ON COLUMN public.users.meta_encryption_version IS 'Encryption version for Meta CAPI token.';

CREATE INDEX IF NOT EXISTS idx_users_meta_capi_token ON public.users(meta_encrypted_access_token) WHERE meta_encrypted_access_token IS NOT NULL;
