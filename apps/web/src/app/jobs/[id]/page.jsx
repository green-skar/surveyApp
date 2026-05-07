import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  ArrowLeft,
  CheckCircle2,
  Play,
  Lock,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { TIER_LABELS } from "@/constants/tiers";

export default function JobDetailPage({ params }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const { data: jobData, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      return res.json();
    },
  });

  const submitTask = useMutation({
    mutationFn: async (taskId) => {
      const res = await fetch("/api/tasks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit task");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Task completed! You earned $${Number(data.reward).toFixed(2)}`,
      );
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setActiveTask(null);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    let timer;
    if (activeTask && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (activeTask && timeLeft === 0) {
      toast.error("Time's up! Task expired.");
      setActiveTask(null);
    }
    return () => clearInterval(timer);
  }, [activeTask, timeLeft]);

  const startTask = (task) => {
    if (jobData && !jobData.hasAccess) {
      toast.error("Unlock a higher tier to start this job.");
      if (typeof window !== "undefined") {
        window.location.href = "/tiers";
      }
      return;
    }
    setActiveTask(task);
    setTimeLeft(task.time_limit_minutes * 60);
  };

  if (isLoading || !jobData?.job) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <DashboardLayout>
      <div className="min-w-0">
        <a
          href="/jobs"
          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={20} />
          Back to Jobs
        </a>

        {!jobData.hasAccess && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Your current tier doesn&apos;t include this job.{" "}
            <a
              href="/tiers"
              className="font-bold text-brand underline hover:no-underline"
            >
              Unlock the required tier
            </a>{" "}
            using available balance (lifetime earnings are not reduced).
          </div>
        )}

        <div className="mb-8 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:p-8 md:p-12">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center md:gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-widest">
                  {jobData.job.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-widest">
                  {TIER_LABELS[jobData.requiredTier] ?? jobData.requiredTier}
                </span>
                {!jobData.hasAccess && (
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <Lock size={12} /> Locked
                  </span>
                )}
              </div>
              <h1 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
                {jobData.job.title}
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                {jobData.job.description}
              </p>
            </div>
            <div className="flex w-full flex-col items-center justify-center rounded-3xl border border-slate-100 bg-slate-50 p-6 sm:w-auto sm:min-w-[180px] sm:p-8">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                Total Potential
              </p>
              <p className="text-4xl font-black text-brand">
                ${Number(jobData.job.total_reward ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 px-2">
            Task Sequence
          </h2>
          {jobData.tasks.map((task, index) => (
            <div
              key={task.id}
              className={`rounded-3xl p-5 transition-all sm:p-6 ${
                task.user_status === "completed"
                  ? "bg-slate-50 border border-slate-100"
                  : "bg-white border border-slate-100 shadow-sm hover:border-brand/30"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex min-w-0 items-center gap-4 sm:gap-6">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                    task.user_status === "completed"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {task.user_status === "completed" ? (
                    <CheckCircle2 size={24} />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="min-w-0">
                  <h4
                    className={`font-bold ${task.user_status === "completed" ? "text-slate-400" : "text-slate-800"}`}
                  >
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="flex items-center gap-1 text-slate-400 font-medium">
                      <Clock size={14} /> {task.time_limit_minutes}m
                    </span>
                    <span className="flex items-center gap-1 text-brand font-bold">
                      <DollarSign size={14} /> $
                      {(
                        (task.reward_cents != null
                          ? Number(task.reward_cents)
                          : Number(task.reward) * 100) / 100
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                </div>

                {task.user_status === "completed" ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600">
                    Completed
                  </div>
                ) : (
                  <button
                    onClick={() => startTask(task)}
                    disabled={!!activeTask || !jobData.hasAccess}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-brand-hover disabled:opacity-50"
                  >
                    <Play size={16} fill="currentColor" />
                    {jobData.hasAccess ? "Start" : "Locked"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Execution Overlay */}
      <AnimatePresence>
        {activeTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-shell/90 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between bg-brand p-8 text-white">
                <div>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">
                    Active Task
                  </p>
                  <h3 className="text-2xl font-bold">{activeTask.title}</h3>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[120px]">
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Time Remaining
                  </p>
                  <p className="text-3xl font-black font-mono">
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </div>

              <div className="p-12 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-slate-800">
                    Survey Question
                  </h4>
                  <p className="text-slate-500 text-lg leading-relaxed">
                    Based on your recent experiences with digital banking, how
                    would you rate the user interface simplicity compared to
                    traditional banking apps?
                  </p>
                  <div className="space-y-3 pt-4">
                    {[
                      "Excellent",
                      "Very Good",
                      "Neutral",
                      "Needs Improvement",
                    ].map((option) => (
                      <button
                        key={option}
                        className="w-full text-left px-6 py-4 rounded-2xl border border-slate-200 hover:border-brand hover:bg-brand/5 transition-all text-slate-700 font-medium flex justify-between items-center group"
                      >
                        {option}
                        <div className="h-5 w-5 rounded-full border-2 border-slate-200 group-hover:border-brand" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTask(null)}
                    className="flex-1 py-4 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitTask.mutate(activeTask.id)}
                    disabled={submitTask.isPending}
                    className="flex-1 py-4 rounded-full bg-brand font-bold text-white shadow-sm transition-colors hover:bg-brand-hover transition-all flex items-center justify-center gap-2"
                  >
                    {submitTask.isPending ? "Submitting..." : "Submit Answer"}
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
