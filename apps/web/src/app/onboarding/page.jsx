"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@auth/create/react";
import { toast } from "sonner";
import {
  Globe,
  Heart,
  Smartphone,
  ArrowRight,
  Mail,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { MOBILE_PAYMENT_PREFERENCES } from "@/constants/mobilePayments";
import { SUPPORTED_COUNTRIES } from "@/constants/supportedCountries";
import IdentityVerificationForm from "@/components/IdentityVerificationForm";

export default function OnboardingPage() {
  const queryClient = useQueryClient();
  const { status: sessionStatus } = useSession();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    country: "",
    interests: [],
    payment_preference: "paypal",
  });

  const [mpesaPhone, setMpesaPhone] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");

  const [payoutVerified, setPayoutVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated" && typeof window !== "undefined") {
      window.location.href = "/account/signin";
    }
  }, [sessionStatus]);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: sessionStatus === "authenticated",
  });

  useEffect(() => {
    setPayoutVerified(false);
    setOtpCode("");
    setOtpSent(false);
    setDevOtpHint(null);
  }, [formData.payment_preference]);

  useEffect(() => {
    if (profile?.country && !formData.country) {
      setFormData((prev) => ({ ...prev, country: profile.country }));
    }
  }, [profile?.country]);

  const buildPayoutDetails = () => {
    const t = formData.payment_preference;
    if (t === "mpesa") return { phone: mpesaPhone };
    if (t === "paypal") return { email: paypalEmail };
    return { accountNumber: bankAccount, bankName };
  };

  const requestOtp = async () => {
    const pref = MOBILE_PAYMENT_PREFERENCES.find(
      (p) => p.value === formData.payment_preference,
    );
    if (pref && !pref.available) {
      toast.info(`${pref.label} is coming soon.`);
      return;
    }

    setSendingOtp(true);
    setDevOtpHint(null);
    try {
      const res = await fetch("/api/payment-methods/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.payment_preference,
          details: buildPayoutDetails(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not send verification code");
        return;
      }
      setOtpSent(true);
      toast.success(
        data.message ||
          `Code sent to ${data.codeSentTo || "your signup email"}.`,
      );
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
        body: JSON.stringify({
          type: formData.payment_preference,
          otp: otpCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }
      setPayoutVerified(true);
      toast.success("Payout method verified and saved.");
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const persistAndFinish = async (body) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Could not save profile (${res.status})`);
        return;
      }
        toast.success("Profile setup complete!");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
        if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      }
    } catch {
      toast.error("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateProfileWithPayout = async () => {
    if (!payoutVerified) {
      toast.error("Verify your payout method with the email code first.");
      return;
    }
    await persistAndFinish({
      ...formData,
      onboarded: true,
      payout_setup_skipped: false,
    });
  };

  const skipPayoutAndFinish = async () => {
    await persistAndFinish({
      ...formData,
      onboarded: true,
      payout_setup_skipped: true,
    });
  };

  const devSkipIdentity = async () => {
    try {
      const res = await fetch("/api/identity/dev-skip", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not skip identity verification.");
        return;
      }
      toast.success("Identity marked as verified (development mode).");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      toast.error("Network error — try again.");
    }
  };

  const goToInterests = () => {
    if (!formData.country.trim()) {
      toast.error("Select your country.");
      return;
    }
    if (!profile?.identityVerified) {
      toast.error("Complete identity verification before continuing.");
      return;
    }
    setStep(2);
  };

  const nextInterests = () => {
    if (formData.interests.length === 0) {
      toast.error("Pick at least one interest, or tap Skip for now.");
      return;
    }
    setStep(3);
  };

  const skipInterests = () => {
    setStep(3);
  };

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-ink">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (sessionStatus === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface p-4 text-ink sm:p-6">
      <div className="w-full max-w-2xl space-y-6 rounded-[2rem] border border-line bg-surface-card p-5 shadow-sm sm:space-y-8 sm:p-8 lg:p-10">
        <div className="mb-8 flex gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${step >= i ? "bg-brand" : "bg-line"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Globe size={32} />
            </div>
              <h2 className="text-3xl font-bold text-ink">Country & identity</h2>
              <p className="text-ink-muted">
                Select your country, then complete verification with the details
                on your government ID. You must verify before continuing.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-muted">Country</label>
                <select
              value={formData.country}
              onChange={(e) =>
                setFormData({ ...formData, country: e.target.value })
              }
                  className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  <option value="">Select country…</option>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-line pt-8 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <BadgeCheck size={32} />
              </div>
              <h3 className="text-xl font-bold text-ink">Verify your identity</h3>
              <p className="text-sm text-ink-muted">
                Enter the information exactly as it appears on your ID. Document
                expiry is detected from the file only.
              </p>

              {profile?.identityVerified ? (
                <div className="rounded-xl border border-success-border bg-success-bg px-4 py-3 text-sm text-success-text">
                  Your identity is verified. You can continue to the next step.
                </div>
              ) : (
                <>
                  <IdentityVerificationForm
                    variant="onboarding"
                    selectedCountry={formData.country}
                    onVerified={() => {
                      queryClient.invalidateQueries({ queryKey: ["profile"] });
                    }}
                  />
                  {import.meta.env.DEV && (
                    <button
                      type="button"
                      onClick={devSkipIdentity}
                      className="w-full rounded-full border border-line py-3 text-sm font-medium text-ink-muted hover:bg-surface-muted"
                    >
                      Development only: skip identity verification
                    </button>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={goToInterests}
              disabled={!profile?.identityVerified}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-lg font-semibold text-white transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue to interests
              <ArrowRight size={20} />
            </button>
            {!profile?.identityVerified && (
              <p className="text-center text-xs text-ink-muted">
                Submit your ID above and wait for confirmation before continuing.
              </p>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Heart size={32} />
            </div>
            <h2 className="text-3xl font-bold text-ink">What are your interests?</h2>
            <p className="text-ink-muted">
              Select topics you&apos;d like to provide feedback on.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                "Technology",
                "Finance",
                "Lifestyle",
                "Health",
                "Education",
                "Entertainment",
              ].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      interests: prev.interests.includes(i)
                        ? prev.interests.filter((x) => x !== i)
                        : [...prev.interests, i],
                    }))
                  }
                  className={`rounded-xl border px-4 py-3 transition-all ${formData.interests.includes(i) ? "border-brand bg-brand/10 text-brand" : "border-line hover:bg-surface-muted"}`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={skipInterests}
                className="text-sm font-medium text-ink-muted underline underline-offset-4 hover:text-brand"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={nextInterests}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-lg font-semibold text-white transition-all hover:bg-brand-hover sm:w-auto sm:min-w-[200px]"
              >
                Next
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Smartphone size={32} />
            </div>
            <h2 className="text-3xl font-bold text-ink">Payout method</h2>
            <p className="text-ink-muted">
              Choose how you want to get paid and enter your details. We send a
              one-time code to the <strong>same email you used to sign up</strong>{" "}
              (your SurveyTasker account email)—not to your PayPal address or
              phone SMS.
            </p>

            <div className="space-y-3">
              {MOBILE_PAYMENT_PREFERENCES.map((pref) => {
                const selected = formData.payment_preference === pref.value;
                const disabled = !pref.available;
                return (
                <button
                    key={pref.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        toast.info(`${pref.label} is coming soon.`);
                        return;
                      }
                    setFormData({
                      ...formData,
                        payment_preference: pref.value,
                      });
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-6 py-4 text-left transition-all ${
                      disabled
                        ? "cursor-not-allowed border-line opacity-60"
                        : selected
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-line hover:bg-surface-muted"
                    }`}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {pref.label}
                        {disabled && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                            Coming soon
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-normal text-ink-muted">
                        {pref.desc}
                      </span>
                    </span>
                    {selected && !disabled && (
                      <div className="h-3 w-3 shrink-0 rounded-full bg-brand" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 rounded-xl border border-line bg-surface-muted/80 p-5">
              {formData.payment_preference === "paypal" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-muted">
                    PayPal email
                  </label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              )}
              {formData.payment_preference === "bank" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink-muted">
                      Account number or IBAN
                    </label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Account number / IBAN"
                      className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-ink-muted">
                      Bank name (optional)
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Equity Bank"
                      className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    />
                  </div>
                </div>
              )}
              {formData.payment_preference === "mpesa" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink-muted">
                    M-Pesa phone number
                  </label>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="+254 7XX XXX XXX or 07XX XXX XXX"
                    className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={requestOtp}
                disabled={sendingOtp || payoutVerified}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/15 py-3 font-semibold text-brand hover:bg-brand/25 disabled:opacity-50"
              >
                {sendingOtp ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}
                {payoutVerified
                  ? "Payout method verified"
                  : otpSent
                    ? "Resend code to email"
                    : "Send verification code to my email"}
              </button>

              {devOtpHint && (
                <p className="rounded-lg border border-warn-border bg-warn-bg px-3 py-2 font-mono text-xs text-warn-text">
                  Dev mode (no Resend key): your code is{" "}
                  <strong>{devOtpHint}</strong>
                </p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-muted">
                  6-digit code from email
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
                  disabled={payoutVerified}
                  className="w-full rounded-xl border border-line bg-surface-card px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
                />
              </div>

              <button
                type="button"
                onClick={verifyOtp}
                disabled={verifyingOtp || payoutVerified || otpCode.length !== 6}
                className="w-full rounded-xl border border-line bg-surface-card py-3 font-semibold text-ink hover:bg-surface-muted disabled:opacity-40"
              >
                {verifyingOtp ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Verifying…
                  </span>
                ) : payoutVerified ? (
                  "Verified"
                ) : (
                  "Verify & save payout method"
                  )}
                </button>
            </div>

            <button
              type="button"
              onClick={updateProfileWithPayout}
              disabled={!payoutVerified || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-lg font-semibold text-white transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  Complete setup
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={skipPayoutAndFinish}
              disabled={submitting}
              className="w-full text-center text-sm font-medium text-ink-muted underline underline-offset-4 hover:text-brand disabled:opacity-50"
            >
              Skip payout setup for now
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
