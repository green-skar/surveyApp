import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import useAuth from "@/utils/useAuth";
import { Sparkles } from "lucide-react";

const inputClass =
  "w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-ink placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20";

function SigninPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithCredentials } = useAuth();

  useEffect(() => {
    try {
      const verified = searchParams.get("verified") === "1";
      const raw = sessionStorage.getItem("surveytasker_signin_prefill");
      if (raw) {
        const data = JSON.parse(raw);
        const maxAgeMs = 10 * 60 * 1000;
        if (
          verified &&
          data &&
          data.source === "signup_verified" &&
          typeof data.email === "string" &&
          typeof data.password === "string" &&
          Date.now() - Number(data.ts || 0) < maxAgeMs
        ) {
          setEmail(data.email);
          setPassword(data.password);
        }
        sessionStorage.removeItem("surveytasker_signin_prefill");
      }
    } catch {
      // ignore storage parsing errors
    }
  }, [searchParams]);

  useEffect(() => {
    const qErr = searchParams.get("error");
    const code = searchParams.get("code");
    const verified = searchParams.get("verified");
    if (verified === "1") {
      setError(null);
      setShowResendVerification(false);
      return;
    }
    const effectiveCode =
      code ||
      (qErr && qErr !== "CredentialsSignin" && qErr !== "AccessDenied" ? qErr : null);
    if (qErr === "no-account" || effectiveCode === "no-account") {
      setError(
        <>
          No account for this email.{" "}
          <Link to="/account/signup" className="font-semibold underline">
            Sign up
          </Link>{" "}
          for an account, or check the address you typed.
        </>,
      );
      setShowResendVerification(false);
      return;
    }
    if (qErr === "invalid-credentials" || effectiveCode === "invalid-credentials") {
      setError("Incorrect password. Try again or use Forgot password.");
      setShowResendVerification(false);
      return;
    }
    if (qErr === "CredentialsSignin" && code === "unverified") {
      setError("Pending email verification. Check your inbox before signing in.");
      setShowResendVerification(true);
    } else if (effectiveCode === "unverified") {
      setError("Pending email verification. Check your inbox before signing in.");
      setShowResendVerification(true);
    } else if (qErr === "AccessDenied") {
      setError("Pending email verification. Verify your email first.");
      setShowResendVerification(true);
    } else if (qErr) {
      setError("Invalid user credentials.");
      setShowResendVerification(false);
    }
  }, [searchParams]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowResendVerification(false);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithCredentials({
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });
      if (result?.error) {
        if (result.error === "unverified") {
          setError(
            "Pending email verification. Please verify your email before signing in.",
          );
          setShowResendVerification(true);
        } else if (result.error === "no-account") {
          setError(
            <>
              No account for this email.{" "}
              <Link to="/account/signup" className="font-semibold underline">
                Sign up
              </Link>{" "}
              for an account, or check the address you typed.
            </>,
          );
          setShowResendVerification(false);
        } else if (result.error === "invalid-credentials") {
          setError("Incorrect password. Try again or use Forgot password.");
          setShowResendVerification(false);
        } else if (result.error === "AccessDenied") {
          setError("Pending email verification. Please verify your email first.");
          setShowResendVerification(true);
        } else if (result.error === "CredentialsSignin") {
          try {
            const hintRes = await fetch("/api/auth/signin-hint", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const hint = await hintRes.json().catch(() => ({}));
            if (hint?.hint === "pending_verification") {
              setError(
                "Pending email verification. Please verify your email before signing in.",
              );
              setShowResendVerification(true);
            } else if (hint?.hint === "no_account") {
              setError(
                <>
                  No account for this email.{" "}
                  <Link to="/account/signup" className="font-semibold underline">
                    Sign up
                  </Link>{" "}
                  for an account, or check the address you typed.
                </>,
              );
              setShowResendVerification(false);
            } else if (hint?.hint === "invalid_credentials") {
              setError("Incorrect password. Try again or use Forgot password.");
              setShowResendVerification(false);
            } else {
              setError("Invalid user credentials.");
              setShowResendVerification(false);
            }
          } catch {
            setError("Invalid user credentials.");
            setShowResendVerification(false);
          }
        } else {
          setError("Invalid user credentials.");
          setShowResendVerification(false);
        }
        setLoading(false);
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err?.message?.includes("verify")
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center hero-gradient px-4 py-12">
      <div className="w-full max-w-sm">
        <a href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">
            SurveyTasker
          </span>
        </a>
        <div className="rounded-3xl border border-line bg-surface-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Welcome back. Let&apos;s get earning.
          </p>
          <form onSubmit={onSubmit} autoComplete="off" className="mt-6 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-ink-muted"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-ink-muted"
                >
                  Password
                </label>
                <Link
                  to="/account/forgot-password"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div className="space-y-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <p>{error}</p>
                {showResendVerification && (
                  <a
                    href="/account/verify-pending"
                    className="font-medium text-brand hover:underline"
                  >
                    Resend verification email
                  </a>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-muted">
            Don&apos;t have an account?{" "}
            <a
              href="/account/signup"
              className="font-medium text-brand hover:text-brand-hover"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SigninPage;
