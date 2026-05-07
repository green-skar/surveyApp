import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smartphone,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Plus,
  Info,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MOBILE_PAYOUT_METHODS,
  paymentMethodRowMatches,
} from "@/constants/mobilePayments";
import { PAYOUT_THRESHOLD_CENTS } from "@/constants/tiers";
import PayoutMethodOtpPanel from "@/components/PayoutMethodOtpPanel";

function formatPayoutDestination(m) {
  try {
    const d =
      typeof m.details === "string" ? JSON.parse(m.details) : m.details || {};
    const t = (m.type || "").toLowerCase();
    if (t === "mpesa" || t === "mobile_money") return d.phone || "—";
    if (t === "paypal") return d.email || "—";
    if (t === "bank")
      return d.accountNumber
        ? `${d.accountNumber}${d.bankName ? ` · ${d.bankName}` : ""}`
        : "—";
    return "—";
  } catch {
    return "—";
  }
}

export default function PayoutsPage() {
  const queryClient = useQueryClient();
  const [showPayoutEditor, setShowPayoutEditor] = useState(false);
  const [selectedPayoutType, setSelectedPayoutType] = useState("mpesa");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      return res.json();
    },
  });

  const { data: methods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const res = await fetch("/api/payment-methods");
      return res.json();
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const res = await fetch("/api/payouts");
      return res.json();
    },
  });

  const requestPayout = useMutation({
    mutationFn: async ({ amount, paymentMethodId }) => {
      const res = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethodId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Payout failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payout request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const availableCents = Number(profile?.available_balance_cents ?? 0);
  const lifetimeCents = Number(profile?.lifetime_earnings_cents ?? 0);
  const balance = availableCents / 100;
  const isEligible =
    lifetimeCents >= PAYOUT_THRESHOLD_CENTS && availableCents > 0;

  const linkedMethod = useMemo(() => {
    if (!methods?.length) return null;
    return methods.find((m) =>
      paymentMethodRowMatches(selectedPayoutType, m.type),
    );
  }, [methods, selectedPayoutType]);

  useEffect(() => {
    if (!methods?.length) return;
    const hasMpesa = methods.some((m) => paymentMethodRowMatches("mpesa", m.type));
    const hasPaypal = methods.some((m) =>
      paymentMethodRowMatches("paypal", m.type),
    );
    const hasBank = methods.some((m) =>
      paymentMethodRowMatches("bank", m.type),
    );
    setSelectedPayoutType((current) => {
      const currentLinked = methods.some((m) =>
        paymentMethodRowMatches(current, m.type),
      );
      if (currentLinked) return current;
      if (hasMpesa) return "mpesa";
      if (hasPaypal) return "paypal";
      if (hasBank) return "bank";
      return current;
    });
  }, [methods]);

  const identityOk = Boolean(profile?.identityVerified);
  const canSubmitPayout = Boolean(
    isEligible && linkedMethod && identityOk && !requestPayout.isPending,
  );

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center md:gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Withdraw Funds
            </h1>
            <p className="text-slate-500">
              PayPal, bank transfer, and M-Pesa are available. Adding or changing
              a payout method requires a verification code sent to your signup
              email.
            </p>
          </div>
          <div className="w-full rounded-3xl border border-slate-100 bg-white px-6 py-4 text-center shadow-sm sm:w-auto sm:min-w-[200px] sm:px-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Available to Cash Out
            </p>
            <p className="text-3xl font-black text-brand">
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="min-w-0 space-y-6 sm:space-y-8 lg:col-span-2">
            {/* Request Section */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm sm:rounded-[2.5rem] sm:p-10">
              {!isEligible && (
                <div className="mb-8 flex items-start gap-4 rounded-2xl border border-warn-border bg-warn-bg p-4 text-warn-text">
                  <Info size={24} className="flex-shrink-0" />
                  <p className="text-sm font-medium">
                    You need at least{" "}
                    <strong>${(PAYOUT_THRESHOLD_CENTS / 100).toFixed(2)}</strong>{" "}
                    in <strong>lifetime earnings</strong> and some available
                    balance to cash out. Optional{" "}
                    <a href="/tiers" className="underline font-bold">
                      tier unlocks
                    </a>{" "}
                    help you earn faster—they never reduce your lifetime total.
                  </p>
                </div>
              )}

              {isEligible && !identityOk && (
                <div className="mb-8 flex items-start gap-4 rounded-2xl border border-line bg-surface-muted p-4 text-ink">
                  <Info size={24} className="flex-shrink-0 text-brand" />
                  <p className="text-sm font-medium">
                    Complete{" "}
                    <strong>identity verification</strong> in{" "}
                    <a
                      href="/settings#identity-verification"
                      className="font-bold text-brand underline"
                    >
                      Settings
                    </a>{" "}
                    before you can request a cash out.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                    Payout method
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {MOBILE_PAYOUT_METHODS.map((opt) => {
                      const selected = selectedPayoutType === opt.type;
                      const isLive = opt.available;
                      const isLinked =
                        isLive &&
                        methods?.some((m) =>
                          paymentMethodRowMatches(opt.type, m.type),
                        );
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          disabled={!isLive}
                          onClick={() => {
                            if (!isLive) {
                              toast.info(`${opt.label} is coming soon.`);
                              return;
                            }
                            setSelectedPayoutType(opt.type);
                            setShowPayoutEditor(false);
                          }}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                            !isLive
                              ? "border-slate-100 bg-slate-50/80 opacity-70 cursor-not-allowed"
                              : selected
                                ? "border-brand bg-brand/5"
                                : "border-slate-200 bg-slate-50 hover:border-brand/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-brand border border-slate-100 flex-shrink-0">
                              <Smartphone size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-800">
                                  {opt.label}
                                </p>
                                {!isLive && (
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                    Coming soon
                                  </span>
                                )}
                                {isLive && isLinked && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-success-text">
                                    Linked
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {isLive && !isLinked
                                  ? "Add this method to request a payout."
                                  : isLive
                                    ? "Ready for withdrawal requests"
                                    : "Not available yet"}
                              </p>
                            </div>
                          </div>
                          {selected && isLive && (
                            <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center text-white flex-shrink-0">
                              <CheckCircle2 size={14} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        toast.info(
                          "Additional payout providers are coming soon.",
                        )
                      }
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand hover:text-brand transition-all"
                    >
                      <Plus size={20} />
                      <span className="font-bold">More methods</span>
                    </button>
                  </div>
                  {linkedMethod && !showPayoutEditor && (
                    <div className="mt-4 rounded-2xl border border-success-border bg-success-bg px-5 py-4">
                      <p className="text-sm font-semibold text-success-text">
                        Linked {MOBILE_PAYOUT_METHODS.find((o) => o.type === selectedPayoutType)?.label || selectedPayoutType}
                      </p>
                      <p className="mt-1 break-all font-mono text-sm text-ink-muted">
                        {formatPayoutDestination(linkedMethod)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPayoutEditor(true)}
                        className="mt-3 text-sm font-bold text-brand hover:underline"
                      >
                        Change payout details
                      </button>
                      <p className="mt-2 text-xs text-ink-muted">
                        We&apos;ll email a code to your SurveyTasker signup address
                        before saving any change.
                      </p>
                    </div>
                  )}

                  {MOBILE_PAYOUT_METHODS.find((o) => o.type === selectedPayoutType)
                    ?.available &&
                    (!linkedMethod || showPayoutEditor) && (
                      <div className="mt-4">
                        {linkedMethod && showPayoutEditor && (
                          <button
                            type="button"
                            onClick={() => setShowPayoutEditor(false)}
                            className="mb-3 text-sm font-medium text-slate-500 hover:text-slate-800"
                          >
                            Cancel change
                          </button>
                        )}
                        <PayoutMethodOtpPanel
                          methodType={selectedPayoutType}
                          onVerified={() => {
                            queryClient.invalidateQueries({
                              queryKey: ["payment-methods"],
                            });
                            setShowPayoutEditor(false);
                          }}
                        />
                      </div>
                    )}
                </div>

                <button
                  disabled={!canSubmitPayout}
                  onClick={() =>
                    requestPayout.mutate({
                      amount: balance,
                      paymentMethodId: linkedMethod.id,
                    })
                  }
                  className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-xl flex items-center justify-center gap-3 ${
                    canSubmitPayout
                      ? "bg-brand text-white hover:bg-brand-hover shadow-sm"
                      : "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                  }`}
                >
                  <ArrowUpRight size={24} />
                  {requestPayout.isPending
                    ? "Processing Request..."
                    : "Request Cash Out"}
                </button>
              </div>
            </div>

            {/* History */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 px-2">
                Transaction History
              </h2>
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Date
                      </th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Method
                      </th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Amount
                      </th>
                      <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payouts?.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-8 py-12 text-center text-slate-400 font-medium"
                        >
                          No transactions found yet.
                        </td>
                      </tr>
                    ) : (
                      payouts?.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-8 py-6 text-sm text-slate-600 font-medium">
                            {new Date(p.requested_at).toLocaleDateString()}
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-bold text-slate-800 capitalize">
                              {p.method_type}
                            </span>
                          </td>
                          <td className="px-8 py-6 font-black text-slate-900">
                            ${parseFloat(p.amount).toFixed(2)}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span
                              className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                                p.status === "paid"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : p.status === "pending"
                                    ? "bg-amber-100 text-amber-600"
                                    : "bg-red-100 text-red-600"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Payment Help</h2>
            <div className="space-y-4">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4 text-sm leading-relaxed">
                <div className="flex items-center gap-3 text-brand font-bold mb-2">
                  <Clock size={18} />
                  Processing Time
                </div>
                <p className="text-slate-500">
                  Withdrawals are processed every <strong>Thursday</strong> at
                  10:00 AM UTC. Ensure your method is verified by Tuesday.
                </p>
                <div className="h-px bg-slate-100 w-full" />
                <div className="flex items-center gap-3 text-brand font-bold mb-2 pt-2">
                  <ShieldCheck size={18} />
                  Security First
                </div>
                <p className="text-slate-500">
                  Payments are only sent to accounts matching your profile name.
                  Contact support if you need to update your payout details.
                </p>
              </div>

              <div className="bg-shell p-8 rounded-3xl text-white shadow-lg relative overflow-hidden group">
                <div className="relative z-10">
                  <h4 className="font-bold text-brand-soft mb-2">Earn faster</h4>
                  <p className="text-sm text-white/70">
                    Higher tiers unlock better-paying tasks. Upgrades use only
                    your available balance.
                  </p>
                  <a
                    href="/tiers"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-white hover:gap-2 transition-all"
                  >
                    Tier access <ArrowUpRight size={14} />
                  </a>
                </div>
                <div className="absolute -right-8 -bottom-8 h-24 w-24 bg-brand/25 rounded-full blur-2xl group-hover:bg-brand/35 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
