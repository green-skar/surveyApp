import { useEffect } from "react";
import { useSession } from "@auth/create/react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import AdminChrome from "@/components/AdminChrome";

export default function AdminPayoutsPage() {
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
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payouts");
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
      <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
      <p className="mt-1 text-slate-500">Recent payout requests.</p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Requested</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{p.id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.user_id}</td>
                  <td className="px-4 py-3">${Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3">{p.method_type ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.requested_at
                      ? new Date(p.requested_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminChrome>
  );
}
