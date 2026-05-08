import { useEffect, useRef, useState } from "react";
import useAuth from "@/utils/useAuth";
import { Loader2, Sparkles } from "lucide-react";
import { createLogger, errorMeta } from "@/lib/logger";

const signupPageLog = createLogger("auth_signup_page");

const inputClass =
  "w-full rounded-2xl border border-line bg-surface-card px-4 py-3 text-ink focus:border-brand focus:ring-2 focus:ring-brand/20";

function messageForSignupError(code) {
  switch (code) {
    case "service-unavailable":
      return "Sign-up is temporarily unavailable because the database connection failed. Please try again shortly.";
    case "db-auth-failed":
      return "Sign-up cannot connect to the database because the DB username/password is invalid. Update DATABASE_URL and try again.";
    case "db-sequence-misaligned":
      return "Sign-up hit a database ID sequencing issue. Please retry in a few seconds. If it persists, restart the server or run migrations.";
    case "verification-email-failed":
      return "Your account was created, but we could not send the verification email. Please use resend verification in a moment or contact support.";
    case "username-taken":
      return "That username is already taken. Try another one or sign in if it is yours.";
    case "username-conflicts-email":
      return "That username matches another member’s email address. Choose a different username.";
    case "email-reserved-as-username":
      return "This email is already in use as another member’s username. Use a different email or sign in.";
    case "CredentialsSignin":
      return "Sign-up could not be completed. Please verify your details and try again.";
    default:
      return code ? `Sign-up failed (${code}). Please try again.` : null;
  }
}

function SignupPage() {
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("form");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [pendingVerificationMode, setPendingVerificationMode] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState(null);
  const hasHandledVerifiedRef = useRef(false);
  const hasScheduledRedirectRef = useRef(false);

  const { signUpWithCredentials } = useAuth();

  useEffect(() => {
    if (stage !== "waiting") return undefined;
    let cancelled = false;
    const poll = async () => {
      if (!email) return;
      try {
        setCheckingVerification(true);
        const res = await fetch("/api/auth/verification-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data?.status === "missing") {
          setError(
            "We could not find your account yet. If you just signed up, wait a moment and refresh, or try signing up again.",
          );
          return;
        }
        const isVerified =
          data?.status === "verified" ||
          (data?.verified === true && data?.status !== "missing" && data?.status !== "pending");
        if (isVerified && !hasHandledVerifiedRef.current) {
          hasHandledVerifiedRef.current = true;
          try {
            sessionStorage.setItem(
              "surveytasker_signin_prefill",
              JSON.stringify({
                email,
                password,
                source: "signup_verified",
                ts: Date.now(),
              }),
            );
          } catch {
            // ignore storage issues
          }
          setStage("verified");
        }
      } catch {
        // ignore transient network errors while polling
      } finally {
        if (!cancelled) setCheckingVerification(false);
      }
    };
    poll();
    const id = setInterval(poll, 3500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stage, email, password]);

  useEffect(() => {
    if (stage !== "verified" || hasScheduledRedirectRef.current) return;
    hasScheduledRedirectRef.current = true;
    const timeoutId = setTimeout(() => {
      window.location.href = "/account/signin?verified=1";
    }, 2200);
    return () => clearTimeout(timeoutId);
  }, [stage]);

  const requestResendVerification = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setResendNotice({ type: "error", text: "Enter your email above first." });
      return;
    }
    setResendLoading(true);
    setResendNotice(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setResendNotice({
          type: "error",
          text: data.error || "No account found for this email.",
        });
        return;
      }
      if (!res.ok) {
        setResendNotice({
          type: "error",
          text: data.error || "Could not send email. Try again.",
        });
        return;
      }
      if (data.alreadyVerified) {
        setResendNotice({
          type: "info",
          text: "This email is already verified. You can sign in.",
        });
        return;
      }
      setResendNotice({
        type: "success",
        text: "A new verification link was sent. Check your inbox and spam folder.",
      });
    } catch {
      setResendNotice({ type: "error", text: "Network error. Try again." });
    } finally {
      setResendLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendNotice(null);
    setPendingVerificationMode(false);
    setStage("form");
    hasHandledVerifiedRef.current = false;
    hasScheduledRedirectRef.current = false;

    if (!email || !password || !name) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const result = await signUpWithCredentials({
        email,
        password,
        name,
        callbackUrl: "/account/signin",
        redirect: false,
      });

      if (result?.error === "AccessDenied") {
        setStage("waiting");
        return;
      }
      if (result?.error) {
        if (result.error === "pending-verification-signup") {
          setPendingVerificationMode(true);
          setError(null);
          return;
        }
        if (result.error === "email-already-verified") {
          setError(
            <>
              An account with this email is already verified.{" "}
              <a href="/account/signin" className="font-semibold underline">
                Sign in
              </a>{" "}
              instead.
            </>,
          );
          return;
        }
        const msg = messageForSignupError(result.error);
        setError(msg);
        return;
      }

      setStage("waiting");
    } catch (err) {
      signupPageLog.error("submit_unexpected", errorMeta(err));
      setError(
        "Sign-up failed unexpectedly. If your email is new, check the browser console or server logs for details.",
      );
    } finally {
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
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Create account
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Start earning with transparent, tier-based tasks.
          </p>

          {stage !== "form" ? (
            <div className="mt-6 space-y-4">
              <div
                className={`rounded-2xl border p-4 text-sm transition-all duration-500 ${
                  stage === "verified"
                    ? "border-success-border bg-success-bg text-success-text"
                    : "border-line bg-surface-muted text-ink"
                }`}
              >
                {stage === "waiting" ? (
                  <>
                    <p className="font-semibold text-ink">Verify your email to continue</p>
                    <p className="mt-2 text-ink-muted">
                      We sent a verification link to <strong>{email}</strong>. Once
                      verified, this page updates automatically.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-ink-muted">
                      {checkingVerification ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Checking verification status...
                        </>
                      ) : (
                        "Waiting for verification..."
                      )}
                    </div>
                    <p className="mt-2 text-xs opacity-80">
                      If you do not see the email, check spam/promotions. In local
                      dev, the link may be printed in the server logs.
                    </p>
                    <button
                      type="button"
                      onClick={requestResendVerification}
                      disabled={resendLoading}
                      className="mt-4 w-full rounded-full border border-line py-2 text-sm font-semibold text-ink transition-colors hover:bg-white disabled:opacity-50"
                    >
                      {resendLoading ? "Sending…" : "Resend verification email"}
                    </button>
                    {resendNotice && (
                      <p
                        className={`mt-2 text-xs ${
                          resendNotice.type === "success"
                            ? "text-green-700"
                            : resendNotice.type === "info"
                              ? "text-ink-muted"
                              : "text-red-600"
                        }`}
                      >
                        {resendNotice.text}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Email verified successfully</p>
                    <p className="mt-2 opacity-90">
                      Great news, your account is active. Redirecting you to sign in...
                    </p>
                  </>
                )}
              </div>
              <div
                className={`overflow-hidden rounded-2xl border border-line bg-white transition-all duration-700 ${
                  stage === "verified" ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <iframe
                  title="Email verified animation"
                  src="https://lottie.host/embed/d8590646-7291-414e-9dde-402034818b0d/fMf2BpONVW.lottie?loop=false&autoplay=true"
                  className="h-72 w-full"
                  allowFullScreen
                />
              </div>
              {stage === "waiting" && (
                <a
                  href="/account/signin"
                  className="block w-full rounded-full border border-line py-3 text-center font-semibold text-ink transition-colors hover:bg-surface-muted"
                >
                  Return to sign in
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {pendingVerificationMode && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Account exists — pending verification</p>
                  <p className="mt-2 text-amber-900/90">
                    This email already has an account that has not been verified yet. Check
                    your inbox for the original link, or request a new verification email.
                  </p>
                  <button
                    type="button"
                    onClick={requestResendVerification}
                    disabled={resendLoading}
                    className="mt-3 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {resendLoading ? "Sending…" : "Send new verification link"}
                  </button>
                  {resendNotice && (
                    <p
                      className={`mt-2 text-xs ${
                        resendNotice.type === "success"
                          ? "text-green-800"
                          : resendNotice.type === "info"
                            ? "text-amber-900/80"
                            : "text-red-700"
                      }`}
                    >
                      {resendNotice.text}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-muted">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="username"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-muted">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-muted">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </form>
          )}

          {stage === "form" && (
            <p className="mt-6 text-center text-sm text-ink-muted">
              Already have an account?{" "}
              <a
                href="/account/signin"
                className="font-medium text-brand hover:text-brand-hover"
              >
                Sign in
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
