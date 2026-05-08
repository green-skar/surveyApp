import { randomBytes } from "node:crypto";
import sql from "@/app/api/utils/sql";
import { sendVerificationEmail } from "@/lib/sendVerificationEmail";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function POST(request) {
  const log = createLogger("auth_resend_verification", {
    requestId: getRequestId(request),
  });
  try {
    log.info("request_received", {});
    const body = await request.json();
    const email = body?.email;
    if (!email || typeof email !== "string") {
      log.warn("invalid_payload", { reason: "missing_or_invalid_email" });
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const trimmed = email.trim();
    log.info("lookup_user", { email: trimmed });
    const users = await sql`
      SELECT id, email, "emailVerified" FROM auth_users WHERE email = ${trimmed}
    `;

    if (!users.length) {
      log.warn("user_not_found", { email: trimmed });
      return Response.json(
        { error: "No account found for this email." },
        { status: 404 },
      );
    }

    if (users[0].emailVerified) {
      log.info("already_verified", { userId: users[0].id });
      return Response.json({ ok: true, alreadyVerified: true });
    }

    await sql`DELETE FROM auth_verification_token WHERE identifier = ${trimmed}`;

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await sql`
      INSERT INTO auth_verification_token (identifier, expires, token)
      VALUES (${trimmed}, ${expires}, ${token})
    `;

    log.info("sending_verification_email", {
      userId: users[0].id,
      email: trimmed,
    });
    await sendVerificationEmail({ to: trimmed, token });
    log.info("verification_email_dispatched", { userId: users[0].id });

    return Response.json({ ok: true });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    if (
      e?.code === "MAIL_NOT_CONFIGURED" ||
      e?.code === "MAIL_PROVIDER_REJECTED" ||
      e?.code === "MAIL_DELIVERY_FAILED"
    ) {
      return Response.json(
        {
          error:
            "Verification email could not be sent. Check email provider settings and try again.",
        },
        { status: 503 },
      );
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
