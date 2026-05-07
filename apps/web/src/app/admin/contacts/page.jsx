import { useEffect } from "react";
import { useSession } from "@auth/create/react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import AdminChrome from "@/components/AdminChrome";

export default function AdminContactsPage() {
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
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/contacts");
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
      <h1 className="text-2xl font-bold text-slate-900">Contact messages</h1>
      <p className="mt-1 text-slate-500">Submissions from the public contact form.</p>
      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500">No messages yet.</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-900">{r.email}</span>
                <span className="text-xs text-slate-400">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString()
                    : ""}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{r.message}</p>
            </div>
          ))
        )}
      </div>
    </AdminChrome>
  );
}
