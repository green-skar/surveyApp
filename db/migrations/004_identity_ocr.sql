-- Run after 003_identity.sql.
-- OCR audit snapshot + optional payout skip flag for onboarding.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_ocr_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS payout_setup_skipped boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.identity_ocr_snapshot IS 'Last successful OCR payload + confidence (audit).';
COMMENT ON COLUMN public.profiles.payout_setup_skipped IS 'True if user completed onboarding without verifying a payout method.';
