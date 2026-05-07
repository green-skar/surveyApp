import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { Sparkles, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const token = params.get("token");
    const email = params.get("email");
    if (!token || !email) {
      setStatus("bad");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });
        if (cancelled) return;
        setStatus(res.ok ? "ok" : "bad");
      } catch {
        if (!cancelled) setStatus("bad");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  return (
    <div className="flex min-h-screen items-center justify-center hero-gradient px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface-card p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-brand" />
            <p className="text-ink-muted">Verifying your email…</p>
          </>
        )}
        {status === "ok" && (
          <>
            <h1 className="text-xl font-bold text-ink">You&apos;re verified</h1>
            <p className="mt-2 text-ink-muted">
              Your email is confirmed. You can sign in now.
            </p>
            <Link
              to="/account/signin"
              className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Sign in
            </Link>
          </>
        )}
        {status === "bad" && (
          <>
            <h1 className="text-xl font-bold text-ink">Link invalid</h1>
            <p className="mt-2 text-ink-muted">
              This verification link may have expired or already been used.
            </p>
            <Link
              to="/account/verify-pending"
              className="mt-6 inline-flex font-semibold text-brand hover:underline"
            >
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
