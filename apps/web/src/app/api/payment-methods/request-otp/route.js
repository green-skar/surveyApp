import { randomInt } from "node:crypto";
import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { isMailConfigured } from "@/lib/mail/sendAppEmail";
import { sendPaymentOtpEmail } from "@/lib/sendPaymentOtpEmail";
import { maskLoginEmail } from "@/lib/maskEmail";

function normalizeMpesaPhone(raw) {
  const s = String(raw || "").replace(/\s+/g, "");
  if (!s) return null;
  if (s.startsWith("+")) return s;
  if (s.startsWith("0")) return `+254${s.slice(1)}`;
  if (s.startsWith("254")) return `+${s}`;
  if (/^\d{9,12}$/.test(s)) return `+${s}`;
  return s;
}

function validateDetails(type, details) {
  if (!details || typeof details !== "object") {
    return { ok: false, error: "Invalid details" };
  }
  if (type === "mpesa") {
    const phone = normalizeMpesaPhone(details.phone);
    if (!phone || phone.length < 10) {
      return { ok: false, error: "Enter a valid M-Pesa phone number" };
    }
    return { ok: true, normalized: { phone } };
  }
  if (type === "paypal") {
    const email = String(details.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Enter a valid PayPal email" };
    }
    return { ok: true, normalized: { email } };
  }
  if (type === "bank") {
    const accountNumber = String(details.accountNumber || "").trim();
    if (accountNumber.length < 6) {
      return { ok: false, error: "Enter your account number or IBAN" };
    }
    const bankName = String(details.bankName || "").trim() || "Bank transfer";
    return { ok: true, normalized: { accountNumber, bankName } };
  }
  return { ok: false, error: "Unsupported payout method" };
}

function maskDestination(type, norm) {
  if (type === "mpesa") {
    const p = norm.phone;
    return p.length > 4 ? `••••${p.slice(-4)}` : p;
  }
  if (type === "paypal") {
    const e = norm.email;
    const [u, d] = e.split("@");
    if (!d) return e;
    return `${u.slice(0, 2)}•••@${d}`;
  }
  return `••••${String(norm.accountNumber).slice(-4)}`;
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(session.user.id);
    const body = await request.json();
    const { type, details } = body || {};

    if (!["mpesa", "paypal", "bank"].includes(type)) {
      return Response.json({ error: "Invalid method type" }, { status: 400 });
    }

    const v = validateDetails(type, details);
    if (!v.ok) {
      return Response.json({ error: v.error }, { status: 400 });
    }

    const emailRows =
      await sql`SELECT email FROM auth_users WHERE id = ${Number(userId)}`;
    const loginEmail = emailRows[0]?.email;
    if (!loginEmail) {
      return Response.json(
        { error: "No email on your account to send a code to" },
        { status: 400 },
      );
    }

    const otp = String(randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await sql.begin(async (tx) => {
      await tx`
        DELETE FROM payment_method_otp_challenges
        WHERE user_id = ${userId} AND consumed = false
      `;

      await tx`
        INSERT INTO payment_method_otp_challenges
          (user_id, method_type, details, otp_code, expires_at)
        VALUES
          (${userId}, ${type}, ${JSON.stringify(v.normalized)}, ${otp}, ${expires})
      `;
    });

    await sendPaymentOtpEmail({
      to: loginEmail,
      code: otp,
      methodLabel:
        type === "mpesa"
          ? "M-Pesa"
          : type === "paypal"
            ? "PayPal"
            : "Bank transfer",
      destinationHint: maskDestination(type, v.normalized),
    });

    const codeSentTo = maskLoginEmail(loginEmail);
    const payload = {
      ok: true,
      codeSentTo,
      message: `Verification code sent to ${codeSentTo} (your SurveyTasker signup email).`,
    };
    if (!isMailConfigured()) {
      payload.devOtp = otp;
      payload.message +=
        " Email not configured — use the dev code shown on screen.";
    }

    return Response.json(payload);
  } catch (e) {
    console.error(e);
    if (
      String(e?.message || "").includes("payment_method_otp_challenges") ||
      String(e?.code || "") === "42P01"
    ) {
      return Response.json(
        {
          error:
            "Database migration required: run db/migrations/005_payment_otp.sql on your Postgres database.",
        },
        { status: 503 },
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
