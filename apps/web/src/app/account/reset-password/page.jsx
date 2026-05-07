import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Sparkles } from "lucide-react";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const token = params.get("token") || "";
  const email = params.get("email") || "";

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid reset link. Request a new one from forgot password.");
    }
  }, [token, email]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset failed");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-gradient px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">
            SurveyTasker
          </span>
        </Link>
        <div className="rounded-3xl border border-line bg-surface-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-ink">New password</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Choose a new password for <strong>{email || "your account"}</strong>.
          </p>

          {done ? (
            <p className="mt-6 rounded-2xl border border-success-border bg-success-bg p-4 text-sm text-success-text">
              Password updated.{" "}
              <Link to="/account/signin" className="font-semibold text-brand">
                Sign in
              </Link>
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (8+ characters)"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || !token || !email}
                className="w-full rounded-full bg-brand py-3 font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
