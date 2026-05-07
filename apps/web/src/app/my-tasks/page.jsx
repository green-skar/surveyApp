"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Briefcase,
  DollarSign,
  Filter,
  Star,
  Calendar,
  BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    border: "border-emerald-200",
  },
  pending: {
    label: "In Progress",
    icon: Clock,
    bg: "bg-amber-100",
    text: "text-amber-600",
    border: "border-amber-200",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    bg: "bg-red-100",
    text: "text-red-500",
    border: "border-red-200",
  },
};

export default function MyTasksPage() {
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/my-tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const tasks = data?.tasks || [];
  const summary = data?.summary || {};

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const filters = [
    { key: "all", label: "All Tasks" },
    { key: "completed", label: "Completed" },
    { key: "pending", label: "In Progress" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Tasks
          </h1>
          <p className="text-slate-500 mt-1">
            Track your task history and progress.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          <motion.div
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Completed
              </p>
            </div>
            <p className="text-4xl font-black text-slate-900">
              {isLoading ? "—" : parseInt(summary.completed_count || 0)}
            </p>
            <div className="absolute -right-4 -bottom-4 h-20 w-20 bg-emerald-50 rounded-full opacity-60" />
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                In Progress
              </p>
            </div>
            <p className="text-4xl font-black text-slate-900">
              {isLoading ? "—" : parseInt(summary.pending_count || 0)}
            </p>
            <div className="absolute -right-4 -bottom-4 h-20 w-20 bg-amber-50 rounded-full opacity-60" />
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <DollarSign size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Total Earned
              </p>
            </div>
            <p className="text-4xl font-black text-slate-900">
              {isLoading
                ? "—"
                : `$${parseFloat(summary.total_earned || 0).toFixed(2)}`}
            </p>
            <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-brand-soft opacity-50" />
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-slate-400 mr-2">
            <Filter size={16} />
            <span className="text-sm font-semibold">Filter:</span>
          </div>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                filter === f.key
                  ? "bg-brand text-white shadow-sm"
                  : "border border-line bg-white text-ink-muted hover:border-brand hover:text-brand"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-slate-100 animate-pulse h-24"
              />
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-slate-100 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <BarChart2 size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">
                No tasks found
              </h3>
              <p className="text-slate-400 text-sm">
                {filter === "all"
                  ? "You haven't started any tasks yet."
                  : `No ${filter} tasks to show.`}
              </p>
              {filter === "all" && (
                <a
                  href="/jobs"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-bold text-white transition-colors hover:bg-brand-hover"
                >
                  <Briefcase size={16} />
                  Browse Available Jobs
                </a>
              )}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((task, i) => {
                const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
                  >
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Left: Icon + Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`h-12 w-12 rounded-2xl flex-shrink-0 flex items-center justify-center ${task.is_premium ? "bg-warn-bg text-warn-text" : "bg-brand-soft text-brand"}`}
                        >
                          {task.is_premium ? (
                            <Star size={20} fill="currentColor" />
                          ) : (
                            <Briefcase size={20} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800 truncate">
                              {task.task_title}
                            </h3>
                            {task.is_premium && (
                              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                PREMIUM
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {task.job_title} &bull; {task.category}
                          </p>
                          {task.completed_at && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                              <Calendar size={11} />
                              <span>
                                {new Date(task.completed_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Reward + Status */}
                      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                        <p className="text-xl font-black text-slate-900">
                          $
                          {parseFloat(
                            task.reward_earned || task.task_reward || 0,
                          ).toFixed(2)}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <Icon size={12} />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* CTA to browse more jobs */}
        {!isLoading && tasks.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-br from-shell to-shell-elevated p-8 text-white shadow-lg sm:flex-row">
            <div>
              <h3 className="text-xl font-bold mb-1">Ready for more?</h3>
              <p className="text-slate-400 text-sm">
                More tasks are available for you to complete and earn.
              </p>
            </div>
            <a
              href="/jobs"
              className="flex flex-shrink-0 items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
            >
              <Briefcase size={16} />
              Browse Jobs
            </a>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
