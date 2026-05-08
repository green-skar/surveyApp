import { useEffect } from "react";
import { useSession } from "@auth/create/react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminChrome from "@/components/AdminChrome";
import { toast } from "sonner";

function Badge({ children, variant }) {
  const base =
    "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset";
  const styles =
    variant === "success"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-500/30"
      : variant === "warning"
        ? "bg-amber-50 text-amber-900 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-500/30"
        : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-500/40";
  return <span className={`${base} ${styles}`}>{children}</span>;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: ready,
  });

  const approveMutation = useMutation({
    mutationFn: async (userId) => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (data?.alreadyVerified) {
        toast.message("Email was already verified");
      } else {
        toast.success("Email approved — user can sign in");
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Approval failed");
    },
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Registered tasker accounts (auth_users).
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {isLoading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading…</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email status</th>
                <th className="px-4 py-3">Identity</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const idVerified = Boolean(u.identity_verified_at);
                return (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 dark:border-slate-800"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 dark:text-slate-200">
                      {u.id}
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{u.email}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                      {u.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.email_verified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {idVerified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="warning">Not verified</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!u.email_verified ? (
                        <button
                          type="button"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(u.id)}
                          className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20 disabled:opacity-50 dark:text-[var(--color-brand)]"
                        >
                          Approve email
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminChrome>
  );
}
