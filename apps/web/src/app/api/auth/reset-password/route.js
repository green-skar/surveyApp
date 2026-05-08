import sql from "@/app/api/utils/sql";
import { hash } from "argon2";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

const RESET_PREFIX = "password-reset:";

export async function POST(request) {
  const log = createLogger("api_auth_reset_password", {
    requestId: getRequestId(request),
  });
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!email || !token || password.length < 8) {
      return Response.json(
        { error: "Email, token, and password (min 8 characters) are required" },
        { status: 400 },
      );
    }

    const identifier = `${RESET_PREFIX}${email}`;
    const used = await sql`
      DELETE FROM auth_verification_token
      WHERE identifier = ${identifier} AND token = ${token}
      RETURNING identifier
    `;

    if (!used.length) {
      return Response.json(
        { error: "Invalid or expired reset link. Request a new one." },
        { status: 400 },
      );
    }

    const users = await sql`SELECT id FROM auth_users WHERE email = ${email}`;
    const userId = users[0]?.id;
    if (!userId) {
      return Response.json({ error: "User not found" }, { status: 400 });
    }

    const hashed = await hash(password);
    const updated = await sql`
      UPDATE auth_accounts
      SET password = ${hashed}
      WHERE "userId" = ${userId} AND provider = 'credentials'
      RETURNING id
    `;

    if (!updated.length) {
      return Response.json(
        { error: "No password login found for this account." },
        { status: 400 },
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
