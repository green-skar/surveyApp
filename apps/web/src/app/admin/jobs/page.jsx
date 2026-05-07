import { useEffect } from "react";
import { useSession } from "@auth/create/react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import AdminChrome from "@/components/AdminChrome";

export default function AdminJobsPage() {
  const { data: session, status } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "unauthenticated") navigate("/admin/signin", { replace: true });
    else if (status === "authenticated") {
      if (session?.user?.role !== "admin") navigate("/", { replace: true });
      else if (session.user.mustChangePassword)
        navigate("/admin/first-login", { replace: true });
    }
  }, [status, session, navigate]);

  const ready =
    status === "authenticated" &&
    session?.user?.role === "admin" &&
    !session?.user?.mustChangePassword;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/jobs");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: ready,
  });

  if (status === "loading" || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">Loading…</div>
    );
  }

  return (
    <AdminChrome>
      <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
      <p className="mt-1 text-slate-500">Jobs and task counts.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Tasks</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{j.id}</td>
                  <td className="px-4 py-3">{j.title}</td>
                  <td className="px-4 py-3">{j.required_tier ?? "—"}</td>
                  <td className="px-4 py-3">{j.task_count ?? 0}</td>
                  <td className="px-4 py-3">{j.is_active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminChrome>
  );
}
