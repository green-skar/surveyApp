"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Zap,
  ArrowRight,
} from "lucide-react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl bg-shell px-4 py-3 text-sm text-white shadow-lg">
        <p className="mb-1 font-bold text-white/70">{label}</p>
        <p className="text-base font-black text-brand-soft">
          ${parseFloat(payload[0].value).toFixed(2)}
        </p>
        <p className="text-xs text-white/60">
          {payload[0].payload.tasks_completed} task
          {payload[0].payload.tasks_completed !== 1 ? "s" : ""}
        </p>
      </div>
    );
  }
  return null;
};

export default function EarningsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const res = await fetch("/api/earnings");
      if (!res.ok) throw new Error("Failed to fetch earnings");
      return res.json();
    },
  });

  const chartData = (data?.daily || []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    total_earned: parseFloat(d.total_earned),
    tasks_completed: parseInt(d.tasks_completed),
  }));

  const statCards = [
    {
      label: "All Time Earnings",
      value: `$${(data?.allTime || 0).toFixed(2)}`,
      sub: `${data?.taskCount || 0} tasks completed`,
      icon: DollarSign,
      color: "text-brand",
      bg: "bg-brand-soft",
    },
    {
      label: "This Month",
      value: `$${(data?.thisMonth || 0).toFixed(2)}`,
      sub: "Current month total",
      icon: Calendar,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "This Week",
      value: `$${(data?.thisWeek || 0).toFixed(2)}`,
      sub: "Mon – Sun",
      icon: TrendingUp,
      color: "text-brand-muted",
      bg: "bg-brand-soft",
    },
    {
      label: "Tasks Done",
      value: data?.taskCount || 0,
      sub: "Lifetime total",
      icon: CheckCircle2,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Earnings
          </h1>
          <p className="text-slate-500 mt-1">
            Your full earning history and performance overview.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"
              >
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-4 ${card.bg} ${card.color}`}
                >
                  <Icon size={20} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {card.label}
                </p>
                <p className="text-3xl font-black text-slate-900">
                  {isLoading ? "—" : card.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                <div
                  className={`absolute -right-4 -bottom-4 h-20 w-20 rounded-full opacity-30 ${card.bg}`}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[2.5rem] sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Daily Earnings (Last 30 Days)
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Your earnings breakdown by day
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">
              <TrendingUp size={14} />
              <span>30-day view</span>
            </div>
          </div>

          {isLoading ? (
            <div className="h-64 bg-slate-50 rounded-2xl flex items-center justify-center">
              <p className="text-slate-400 font-medium">Loading chart…</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <TrendingUp size={22} className="text-slate-400" />
              </div>
              <p className="text-slate-400 font-medium text-sm">
                No earnings data yet. Complete your first task!
              </p>
              <a
                href="/jobs"
                className="mt-1 flex items-center gap-1 text-sm font-bold text-brand hover:underline"
              >
                Browse Jobs <ArrowRight size={14} />
              </a>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                barSize={28}
                margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "#f1f5f9", radius: 8 }}
                />
                <Bar
                  dataKey="total_earned"
                  fill="#2D4A22"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Earnings Table */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            Recent Rewards
          </h2>
          <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-white shadow-sm">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Task
                  </th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">
                    Job / Category
                  </th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">
                    Date
                  </th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">
                    Earned
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="4" className="px-8 py-5">
                        <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : (data?.recentTasks || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-8 py-14 text-center text-slate-400 font-medium text-sm"
                    >
                      No completed tasks yet. Start earning!
                    </td>
                  </tr>
                ) : (
                  (data?.recentTasks || []).map((task, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <p className="font-bold text-slate-800 text-sm">
                          {task.task_title}
                        </p>
                      </td>
                      <td className="px-8 py-5 hidden sm:table-cell">
                        <p className="text-sm text-slate-500">
                          {task.job_title}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">
                          {task.category}
                        </p>
                      </td>
                      <td className="px-8 py-5 hidden md:table-cell">
                        <p className="text-sm text-slate-500">
                          {task.completed_at
                            ? new Date(task.completed_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <span className="font-black text-emerald-600 text-base">
                          +${parseFloat(task.reward_earned || 0).toFixed(2)}
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upsell */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-br from-shell to-brand p-8 text-white shadow-lg sm:flex-row"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-brand-soft" fill="currentColor" />
              <span className="text-sm font-bold uppercase tracking-wide text-brand-soft">
                Boost Earnings
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-1">Unlock Premium Tasks</h3>
            <p className="text-sm text-white/80">
              Access jobs paying $5–$20 per task and earn 5× faster.
            </p>
          </div>
          <a
            href="/tiers"
            className="flex flex-shrink-0 items-center gap-2 rounded-full bg-surface-card px-7 py-3.5 text-sm font-black text-brand shadow-sm transition-colors hover:bg-surface-muted"
          >
            <Zap size={16} fill="currentColor" />
            Tier access
          </a>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
