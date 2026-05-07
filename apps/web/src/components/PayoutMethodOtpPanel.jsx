import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

function buildDetails(methodType, fields) {
  if (methodType === "mpesa") return { phone: fields.mpesaPhone };
  if (methodType === "paypal") return { email: fields.paypalEmail };
  return { accountNumber: fields.bankAccount, bankName: fields.bankName };
}

/**
 * Add or replace a verified payout method (same flow as onboarding).
 * Codes are always sent to the user's SurveyTasker signup email (auth_users.email).
 */
export default function PayoutMethodOtpPanel({
  methodType,
  onVerified,
  className = "",
}) {
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verified, setVerified] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(null);
  const [lastSentTo, setLastSentTo] = useState(null);

  useEffect(() => {
    setOtpCode("");
    setOtpSent(false);
    setVerified(false);
    setDevOtpHint(null);
    setLastSentTo(null);
  }, [methodType]);

  const fields = { mpesaPhone, paypalEmail, bankAccount, bankName };

  const requestOtp = async () => {
    setSendingOtp(true);
    setDevOtpHint(null);
    try {
      const res = await fetch("/api/payment-methods/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: methodType,
          details: buildDetails(methodType, fields),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not send verification code");
        return;
      }
      setOtpSent(true);
      setLastSentTo(data.codeSentTo || null);
      toast.success(data.message || "Check your signup email for the code.");
      if (data.devOtp) setDevOtpHint(data.devOtp);
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/payment-methods/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: methodType, otp: otpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }
      setVerified(true);
      toast.success("Payout method saved.");
      onVerified?.();
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div
      className={`space-y-4 rounded-2xl border border-line bg-surface-muted/80 p-6 ${className}`}
    >
      <p className="text-sm text-ink-muted">
        We&apos;ll email a verification code to your{" "}
        <strong>SurveyTasker signup address</strong>
        {lastSentTo ? (
          <>
            {" "}
            (<span className="font-mono text-ink">{lastSentTo}</span>)
          </>
        ) : (
          ""
        )}
        . Enter the new payout details below, then request the code.
      </p>

      {methodType === "paypal" && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
            PayPal email
          </label>
          <input
            type="email"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={verified}
            className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </div>
      )}
      {methodType === "bank" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Account number or IBAN
            </label>
            <input
              type="text"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Account number / IBAN"
              disabled={verified}
              className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
              Bank name (optional)
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Equity Bank"
              disabled={verified}
              className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </div>
        </div>
      )}
      {methodType === "mpesa" && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
            M-Pesa phone number
          </label>
          <input
            type="tel"
            value={mpesaPhone}
            onChange={(e) => setMpesaPhone(e.target.value)}
            placeholder="+254 7XX XXX XXX"
            disabled={verified}
            className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          />
        </div>
      )}

      <button
        type="button"
        onClick={requestOtp}
        disabled={sendingOtp || verified}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-brand/30 bg-brand-soft py-3 font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
      >
        {sendingOtp ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Mail className="h-5 w-5" />
        )}
        {verified
          ? "Method verified"
          : otpSent
            ? "Resend code to signup email"
            : "Send verification code"}
      </button>

      {devOtpHint && (
        <p className="rounded-lg border border-warn-border bg-warn-bg px-3 py-2 font-mono text-xs text-warn-text">
          Dev (no Resend): code is <strong>{devOtpHint}</strong>
        </p>
      )}

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
          6-digit code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpCode}
          onChange={(e) =>
            setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="000000"
          disabled={verified}
          className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-center font-mono text-xl tracking-[0.35em] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
        />
      </div>

      <button
        type="button"
        onClick={verifyOtp}
        disabled={verifyingOtp || verified || otpCode.length !== 6}
        className="w-full rounded-full bg-brand py-3 font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
      >
        {verifyingOtp ? (
          <span className="inline-flex items-center gap-2 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Verifying…
          </span>
        ) : verified ? (
          "Done"
        ) : (
          "Verify & save payout method"
        )}
      </button>
    </div>
  );
}
