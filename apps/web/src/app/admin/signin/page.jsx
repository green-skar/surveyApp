import { useState } from "react";
import { signIn } from "@auth/create/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function AdminSignInPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await signIn("admin-credentials", {
        username,
        password,
        redirect: false,
        callbackUrl: "/admin",
      });
      if (result?.error) {
        toast.error("Invalid username or password");
        return;
      }
      if (result?.ok) {
        navigate("/admin", { replace: true });
        return;
      }
      toast.error("Sign-in did not complete");
    } catch (err) {
      toast.error(err?.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Admin sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use your admin username and password (not your tasker email).
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand/30"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-brand/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <a href="/" className="mt-6 block text-center text-sm text-slate-500 hover:text-brand">
          Back to site
        </a>
      </div>
    </div>
  );
}
