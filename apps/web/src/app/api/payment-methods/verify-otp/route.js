import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { sendPaymentMethodVerifiedEmail } from "@/lib/transactionalEmail";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function POST(request) {
  const log = createLogger("api_payment_methods_verify_otp", {
    requestId: getRequestId(request),
  });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(session.user.id);
    const body = await request.json();
    const { type, otp } = body || {};

    if (!["mpesa", "paypal", "bank"].includes(type)) {
      return Response.json({ error: "Invalid method type" }, { status: 400 });
    }
    const code = String(otp || "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      return Response.json({ error: "Enter the 6-digit code" }, { status: 400 });
    }

    const verifiedAt = new Date().toISOString();
    const inserted = await sql`
      WITH latest AS (
        SELECT id, details
        FROM payment_method_otp_challenges
        WHERE user_id = ${userId}
          AND method_type = ${type}
          AND consumed = false
          AND expires_at > NOW()
          AND otp_code = ${code}
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      ),
      consumed AS (
        UPDATE payment_method_otp_challenges p
        SET consumed = true
        FROM latest
        WHERE p.id = latest.id
        RETURNING p.details AS details
      ),
      deleted AS (
        DELETE FROM payment_methods
        WHERE user_id = ${userId} AND type = ${type}
      ),
      inserted AS (
        INSERT INTO payment_methods (user_id, type, details, is_default)
        SELECT
          ${userId},
          ${type},
          jsonb_set((consumed.details)::jsonb, '{verifiedAt}', to_jsonb(${verifiedAt}::text), true),
          true
        FROM consumed
        RETURNING *
      ),
      defaults AS (
        UPDATE payment_methods
        SET is_default = false
        WHERE user_id = ${userId}
          AND id <> (SELECT id FROM inserted LIMIT 1)
      )
      SELECT * FROM inserted
    `;

    if (!inserted.length) {
      return Response.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    const methodLabels = {
      paypal: "PayPal",
      bank: "Bank transfer",
      mpesa: "M-Pesa",
    };
    const to = session.user?.email;
    if (to) {
      try {
        await sendPaymentMethodVerifiedEmail({
          to,
          methodLabel: methodLabels[type] || String(type),
        });
      } catch (e) {
        log.warn("verified_email_send_failed", {
          ...errorMeta(e),
          methodType: type,
        });
      }
    }

    return Response.json({ ok: true, method: inserted[0] });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
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
