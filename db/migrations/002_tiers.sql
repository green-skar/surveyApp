-- Run AFTER 001_baseline.sql on the same database.
-- Adds tier system: user_balances, tier_unlocks, job required_tier, task reward_cents.

CREATE TABLE IF NOT EXISTS public.user_balances (
    user_id text NOT NULL PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    available_balance_cents integer NOT NULL DEFAULT 0,
    lifetime_earnings_cents integer NOT NULL DEFAULT 0,
    total_paid_out_cents integer NOT NULL DEFAULT 0,
    tasks_completed integer NOT NULL DEFAULT 0,
    current_tier text NOT NULL DEFAULT 'tier_1',
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.tier_unlocks (
    id serial PRIMARY KEY,
    user_id text NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    tier text NOT NULL,
    cost_cents integer NOT NULL,
    unlocked_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, tier)
);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_tier text NOT NULL DEFAULT 'tier_1';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.jobs SET required_tier = CASE
    WHEN is_premium IS NOT TRUE THEN 'tier_1'
    WHEN COALESCE(unlock_fee, 0) <= 5 THEN 'tier_2'
    ELSE 'tier_3'
END;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reward_cents integer;
UPDATE public.tasks SET reward_cents = ROUND((COALESCE(reward, 0))::numeric * 100)::integer
WHERE reward_cents IS NULL;
UPDATE public.tasks SET reward_cents = 0 WHERE reward_cents IS NULL;
ALTER TABLE public.tasks ALTER COLUMN reward_cents SET DEFAULT 0;
ALTER TABLE public.tasks ALTER COLUMN reward_cents SET NOT NULL;

INSERT INTO public.user_balances (user_id, available_balance_cents, lifetime_earnings_cents, current_tier, tasks_completed)
SELECT
    p.user_id,
    GREATEST(0, ROUND((COALESCE(p.balance, 0))::numeric * 100))::integer,
    GREATEST(0, ROUND((COALESCE(p.balance, 0))::numeric * 100))::integer,
    CASE WHEN p.is_premium IS TRUE THEN 'tier_2' ELSE 'tier_1' END,
    0
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;
