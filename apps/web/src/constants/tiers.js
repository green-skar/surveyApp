export const PAYOUT_THRESHOLD_CENTS = 1500; // $15 lifetime for cash-out
export const TIER_2_COST_CENTS = 500; // $5
export const TIER_3_COST_CENTS = 1500; // $15

export const TIER_LABELS = {
  tier_1: "Tier 1 — Starter",
  tier_2: "Tier 2 — Growth",
  tier_3: "Tier 3 — Pro",
};

export const TIER_ORDER = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

export function formatCents(cents) {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export function tierLevel(tier) {
  return TIER_ORDER[tier] ?? 1;
}
