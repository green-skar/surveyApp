import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Lock, ChevronRight, Search, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { TIER_LABELS, tierLevel } from "@/constants/tiers";

export default function JobsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to load jobs");
      return res.json();
    },
  });

  const jobs = data?.jobs ?? [];
  const currentTier = data?.currentTier ?? "tier_1";

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center md:gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Available jobs
            </h1>
            <p className="text-slate-500 mt-1">
              {TIER_LABELS[currentTier] ?? currentTier}. Unlock higher tiers on
              the{" "}
              <a href="/tiers" className="text-brand font-semibold hover:underline">
                tier access
              </a>{" "}
              page.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3 rounded-xl border border-slate-200 bg-white focus:border-brand outline-none transition-all w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-3xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {filteredJobs.map((job) => {
              const required = job.required_tier ?? "tier_1";
              const locked =
                job.locked ??
                tierLevel(currentTier) < tierLevel(required);
              return (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -8 }}
                  className="group relative flex min-w-0 flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-brand/25 hover:shadow-2xl sm:p-8"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center ${locked ? "bg-warn-bg text-warn-text" : "bg-brand-soft text-brand"}`}
                    >
                      {locked ? <Lock size={24} /> : <Briefcase size={24} />}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {TIER_LABELS[required] ?? required}
                      </span>
                      {locked && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                          <Lock size={10} />
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="mb-2 line-clamp-2 text-xl font-bold text-slate-800 transition-colors group-hover:text-brand">
                      {job.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-6">
                      {job.description}
                    </p>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-50">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">
                        Potential earnings
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        ${Number(job.total_reward).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">Tasks</span>
                      <span className="font-bold text-slate-700">
                        {job.task_count}
                      </span>
                    </div>
                    <a
                      href={locked ? "/tiers" : `/jobs/${job.id}`}
                      className={`mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all ${
                        locked
                          ? "bg-shell text-white hover:bg-shell-elevated"
                          : "bg-brand text-white hover:bg-brand-hover"
                      }`}
                    >
                      {locked ? (
                        <>
                          <Sparkles size={18} />
                          Unlock tier
                        </>
                      ) : (
                        <>
                          Start earning
                          <ChevronRight size={18} />
                        </>
                      )}
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
