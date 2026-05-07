import { useState } from "react";
import { Link } from "react-router";
import { Sparkles } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
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
          <h1 className="text-2xl font-bold text-ink">Forgot password</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Enter the email you used to sign up. If we find an account,
            we&apos;ll send a reset link. (Without email configured in dev, check
            the server log for the link.)
          </p>

          {done ? (
            <p className="mt-6 rounded-2xl border border-success-border bg-success-bg p-4 text-sm text-success-text">
              If an account exists for that email, we sent instructions. You can
              close this tab or{" "}
              <Link to="/account/signin" className="font-semibold text-brand">
                return to sign in
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand py-3 font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <Link
            to="/account/signin"
            className="mt-6 block text-center text-sm font-medium text-brand hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
