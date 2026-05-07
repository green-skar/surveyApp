-- Run after 001_baseline.sql and 002_tiers.sql.
-- Identity / KYC fields on profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verified_name_snapshot text,
  ADD COLUMN IF NOT EXISTS identity_document_kind text,
  ADD COLUMN IF NOT EXISTS identity_last_submitted_at timestamptz;

COMMENT ON COLUMN public.profiles.identity_verified_at IS 'Set when ID verification succeeds; NULL blocks payouts.';
COMMENT ON COLUMN public.profiles.identity_verified_name_snapshot IS 'Normalized name from document at verification time (audit).';
