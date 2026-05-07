import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  TIER_ORDER,
  TIER_LABELS,
  TIER_2_COST_CENTS,
  TIER_3_COST_CENTS,
  PAYOUT_THRESHOLD_CENTS,
  formatCents,
} from "@/constants/tiers";

const TIERS = [
  {
    id: "tier_1",
    name: "Tier 1 — Starter",
    cost: 0,
    rewardRange: "$4.00 – $5.00 per task",
    description:
      "Get started immediately. Build your lifetime earnings counter.",
  },
  {
    id: "tier_2",
    name: "Tier 2 — Growth",
    cost: TIER_2_COST_CENTS,
    rewardRange: "$1.20 – $2.00 per task",
    description: "Higher rewards and access to more job categories.",
  },
  {
    id: "tier_3",
    name: "Tier 3 — Pro",
    cost: TIER_3_COST_CENTS,
    rewardRange: "$4.00 – $5.00 per task",
    description: "Highest payouts for experienced contributors.",
  },
];

export default function TiersPage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const unlockTier = useMutation({
    mutationFn: async (tier) => {
      const res = await fetch("/api/tiers/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unlock failed");
      return data;
    },
    onSuccess: (_, tier) => {
      toast.success(
        tier === "tier_2" ? "Tier 2 unlocked!" : "Tier 3 unlocked!",
      );
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading || !profile) {
    return (
      <DashboardLayout>
        <p className="text-slate-500 text-sm">Loading…</p>
      </DashboardLayout>
    );
  }

  const userLvl = TIER_ORDER[profile.current_tier ?? "tier_1"] ?? 1;
  const balance = Number(profile.available_balance_cents ?? 0);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Tier access
          </h1>
          <p className="text-slate-500 mt-1">
            Unlock higher-paying jobs by spending{" "}
            <strong>available balance</strong> only. Available:{" "}
            <strong>{formatCents(balance)}</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-950">
            <div className="font-semibold">Unlocks never reduce lifetime earnings</div>
            <p className="mt-1 text-emerald-900/90">
              {`Tier upgrades are paid from your available balance. Your lifetime earnings (used for the $${PAYOUT_THRESHOLD_CENTS / 100} cash-out threshold) are never reduced.`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => {
            const tierLvl = TIER_ORDER[tier.id];
            const unlocked = userLvl >= tierLvl;
            const isCurrent = (profile.current_tier ?? "tier_1") === tier.id;
            const canAfford = balance >= tier.cost;
            const canUnlock =
              !unlocked &&
              tier.id !== "tier_1" &&
              canAfford &&
              (tier.id === "tier_2"
                ? userLvl >= 1
                : userLvl >= 2);

            return (
              <motion.div
                key={tier.id}
                layout
                className={`rounded-2xl border p-6 flex flex-col ${
                  isCurrent
                    ? "border-brand bg-brand/5 shadow-sm"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    {tier.id === "tier_1" ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-surface-card border border-brand/30 px-2 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-bold text-lg text-slate-900">
                  {tier.name}
                </h3>
                <p className="text-sm text-slate-600 mt-2 flex-1">
                  {tier.description}
                </p>
                <p className="text-sm font-semibold text-slate-800 mt-4">
                  {tier.rewardRange}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  {tier.id === "tier_1" && (
                    <p className="text-sm text-slate-500">Free — always on</p>
                  )}
                  {tier.id !== "tier_1" && unlocked && (
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                      <CheckCircle2 size={18} />
                      Unlocked
                    </div>
                  )}
                  {tier.id !== "tier_1" && !unlocked && (
                    <button
                      type="button"
                      disabled={!canUnlock || unlockTier.isPending}
                      onClick={() =>
                        unlockTier.mutate(
                          tier.id === "tier_2" ? "tier_2" : "tier_3",
                        )
                      }
                      className="w-full py-3 rounded-xl font-bold text-sm bg-shell text-white hover:bg-shell-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {canUnlock
                        ? `Unlock for ${formatCents(tier.cost)}`
                        : userLvl < (tier.id === "tier_2" ? 1 : 2)
                          ? "Unlock previous tier first"
                          : !canAfford
                            ? `Need ${formatCents(tier.cost)} available`
                            : "Unavailable"}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400">
          Labels mirror your account tier:{" "}
          {TIER_LABELS[profile.current_tier] ?? profile.current_tier}.
        </p>
      </div>
    </DashboardLayout>
  );
}
