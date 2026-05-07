-- Optional hardening migration for concurrent load.
-- Safe to run repeatedly.

-- Fast lookup for active OTP records by user + method.
CREATE INDEX IF NOT EXISTS idx_payment_otp_user_method_active
  ON public.payment_method_otp_challenges (user_id, method_type, expires_at DESC)
  WHERE consumed = false;

-- Enforce at most one default payout method per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_one_default_per_user
  ON public.payment_methods (user_id)
  WHERE is_default = true;
