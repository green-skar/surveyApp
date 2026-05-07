import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Zap,
  Briefcase,
  Lock,
} from "lucide-react";
import { motion } from "motion/react";
import {
  PAYOUT_THRESHOLD_CENTS,
  TIER_LABELS,
  formatCents,
} from "@/constants/tiers";

export default function DashboardPage() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const { data: jobsPayload } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const jobs = jobsPayload?.jobs ?? [];
  const availableCents = Number(profile?.available_balance_cents ?? 0);
  const lifetimeCents = Number(profile?.lifetime_earnings_cents ?? 0);
  const balance = availableCents / 100;
  const progress = Math.min(
    (lifetimeCents / PAYOUT_THRESHOLD_CENTS) * 100,
    100,
  );
  const toGoCents = Math.max(0, PAYOUT_THRESHOLD_CENTS - lifetimeCents);
  const currentTier = profile?.current_tier ?? "tier_1";

  const needsIdentity = profile && !profile.identityVerified;

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        {needsIdentity && (
          <div
            role="status"
            className="flex flex-col gap-4 rounded-2xl border border-warn-border bg-warn-bg px-6 py-4 text-warn-text sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-sm font-medium">
              Complete{" "}
              <strong className="font-bold">identity verification</strong> in
              Settings to unlock withdrawals.
            </p>
            <a
              href="/settings#identity-verification"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-hover"
            >
              Go to Settings
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <motion.div
            whileHover={{ y: -5 }}
            className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="relative z-10">
              <p className="text-sm font-medium text-slate-500 mb-1">
                Available balance
              </p>
                <h3 className="break-words text-3xl font-bold text-slate-900 sm:text-4xl">
                ${balance.toFixed(2)}
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                {TIER_LABELS[currentTier] ?? currentTier}
              </p>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp size={80} className="text-brand" />
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
          >
            <p className="text-sm font-medium text-slate-500 mb-1">
              Tasks completed
            </p>
            <h3 className="text-4xl font-bold text-slate-900">
              {profile?.tasks_completed ?? 0}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-brand text-sm font-medium">
              <CheckCircle2 size={16} />
              <span>Keep it up!</span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2 sm:p-8"
          >
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Lifetime payout progress
                </p>
                <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {formatCents(toGoCents)} to ${(PAYOUT_THRESHOLD_CENTS / 100).toFixed(0)} lifetime
                </h3>
              </div>
              <span className="text-sm font-bold text-brand bg-brand/10 px-3 py-1 rounded-full">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-muted"
              />
            </div>
            <p className="mt-4 text-xs text-slate-400 font-medium uppercase tracking-wider">
              Cash out when lifetime earnings reach $
              {(PAYOUT_THRESHOLD_CENTS / 100).toFixed(2)}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">
                Available jobs
              </h2>
              <a
                href="/jobs"
                className="text-sm font-bold text-brand hover:underline flex items-center gap-1"
              >
                View all <ArrowRight size={16} />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {jobs.slice(0, 3).map((job) => (
                <motion.div
                  key={job.id}
                  whileHover={{ scale: 1.01 }}
                  className="group flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-brand/25 hover:shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center ${job.locked ? "bg-warn-bg text-warn-text" : "bg-brand-soft text-brand"}`}
                    >
                      {job.locked ? <Lock size={24} /> : <Briefcase size={24} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="flex flex-wrap items-center gap-2 font-bold text-slate-800">
                        {job.title}
                        {job.locked && (
                          <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full">
                            LOCKED
                          </span>
                        )}
                      </h4>
                      <p className="line-clamp-1 text-sm text-slate-500">
                        {job.category} • {job.task_count} tasks
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end sm:gap-6">
                    <div className="hidden sm:block">
                      <p className="text-xs font-medium text-slate-400 uppercase">
                        Up to
                      </p>
                      <p className="text-lg font-bold text-slate-800">
                        ${Number(job.total_reward).toFixed(2)}
                      </p>
                    </div>
                    <a
                      href={`/jobs/${job.id}`}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted transition-all group-hover:border-brand group-hover:bg-brand group-hover:text-white"
                    >
                      <ArrowRight size={20} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>

            {currentTier !== "tier_3" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-shell p-8 text-white shadow-lg"
              >
                <div className="relative z-10">
                  <div className="mb-2 flex items-center gap-2 text-brand-soft">
                    <Zap size={20} fill="currentColor" />
                    <span className="text-sm font-bold uppercase tracking-widest">
                      Tier access
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4">
                    Unlock higher-paying jobs
                  </h3>
                  <p className="text-slate-400 max-w-lg mb-8 text-lg leading-relaxed">
                    Spend available balance only—your lifetime earnings toward
                    payout are never reduced.
                  </p>
                  <a
                    href="/tiers"
                    className="inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
                  >
                    View tier options
                    <ArrowRight size={20} />
                  </a>
                </div>
                <div className="absolute -bottom-20 -right-20 h-64 w-64 bg-brand/25 blur-[100px]" />
              </motion.div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
            <div className="space-y-4">
              {[
                {
                  icon: Clock,
                  title: "New survey available",
                  time: "2m ago",
                  color: "text-brand",
                },
                {
                  icon: CheckCircle2,
                  title: "Task approved",
                  time: "1h ago",
                  color: "text-success-text",
                },
                {
                  icon: AlertCircle,
                  title: "Payout processing",
                  time: "4h ago",
                  color: "text-warn-text",
                },
              ].map((n, i) => (
                <div
                  key={i}
                  className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-4"
                >
                  <div className={`p-2 rounded-xl bg-slate-50 ${n.color}`}>
                    <n.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-shell to-brand p-8 text-white shadow-lg">
              <h4 className="font-bold mb-2">Upcoming payout date</h4>
              <p className="text-3xl font-bold mb-4">Thursday 10:00 UTC</p>
              <div className="h-px bg-white/20 mb-4" />
              <p className="text-sm text-white/80">
                Withdrawals are processed on schedule once you meet the lifetime
                threshold and link a payment method.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
