import { useEffect } from "react";
import { useSession } from "@auth/create/react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import AdminChrome from "@/components/AdminChrome";

function useAdminGate() {
  const { data: session, status } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/admin/signin", { replace: true });
      return;
    }
    if (status === "authenticated") {
      if (session?.user?.role !== "admin") {
        navigate("/", { replace: true });
        return;
      }
      if (session.user.mustChangePassword) {
        navigate("/admin/first-login", { replace: true });
      }
    }
  }, [status, session, navigate]);

  return { session, status };
}

export default function AdminDashboardPage() {
  const { session, status } = useAdminGate();

  const ready =
    status === "authenticated" &&
    session?.user?.role === "admin" &&
    !session?.user?.mustChangePassword;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    enabled: ready,
  });

  if (status === "loading" || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Loading…
      </div>
    );
  }

  return (
    <AdminChrome>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Overview</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">High-level counts across the app.</p>
      {isLoading ? (
        <p className="mt-6 text-slate-500 dark:text-slate-400">Loading stats…</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Active taskers (email verified)", stats?.activeTaskers],
            ["Jobs", stats?.jobs],
            ["Tasks", stats?.tasks],
            ["Payouts", stats?.payouts],
            ["Contact messages", stats?.contactSubmissions],
          ].map(([label, val]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {val ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/admin/users"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          View users
        </Link>
        <Link
          to="/admin/contacts"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Contact inbox
        </Link>
      </div>
    </AdminChrome>
  );
}
