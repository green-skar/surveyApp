-- Run after 001_baseline.sql (and 002_tiers.sql if used).
-- Stores short-lived payout-method verification codes (OTP).

CREATE TABLE IF NOT EXISTS public.payment_method_otp_challenges (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  method_type TEXT NOT NULL,
  details JSONB NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_payment_otp_user_active
  ON public.payment_method_otp_challenges (user_id, consumed)
  WHERE NOT consumed;
