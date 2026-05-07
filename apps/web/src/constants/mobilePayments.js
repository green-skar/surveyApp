/**
 * Payout methods (aligned with apps2): PayPal, bank, M-Pesa.
 * Card remains UI-only until integrated.
 */
export const MOBILE_PAYMENT_PREFERENCES = [
  {
    value: "paypal",
    label: "PayPal",
    desc: "Payouts to your PayPal email",
    available: true,
  },
  {
    value: "bank",
    label: "Bank transfer",
    desc: "Direct deposit using account number or IBAN",
    available: true,
  },
  {
    value: "mpesa",
    label: "M-Pesa",
    desc: "Receive earnings to your M-Pesa mobile wallet",
    available: true,
  },
  {
    value: "card",
    label: "Debit or credit card",
    desc: "Payout to a linked card",
    available: false,
  },
];

export const MOBILE_PAYOUT_METHODS = MOBILE_PAYMENT_PREFERENCES.map(
  ({ value, label, available }) => ({
    type: value,
    label,
    available,
  }),
);

export function normalizePaymentPreference(value) {
  if (value == null || value === "") return "";
  const v = String(value).toLowerCase().trim();
  if (v === "mobile_money") return "mpesa";
  return v;
}

export function paymentMethodRowMatches(typeKey, rowType) {
  const t = (rowType || "").toLowerCase();
  const key = (typeKey || "").toLowerCase();
  if (key === "mpesa") return t === "mpesa" || t === "mobile_money";
  return t === key;
}
