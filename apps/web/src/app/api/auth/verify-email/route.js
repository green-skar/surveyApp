import sql from "@/app/api/utils/sql";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function POST(request) {
  const log = createLogger("api_auth_verify_email", {
    requestId: getRequestId(request),
  });
  try {
    const body = await request.json();
    const { token, email } = body ?? {};
    if (!token || !email || typeof token !== "string" || typeof email !== "string") {
      return Response.json({ error: "Token and email are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim();
    const normalizedToken = token.trim();

    const existingUser = await sql`
      SELECT "emailVerified"
      FROM auth_users
      WHERE email = ${normalizedEmail}
      LIMIT 1
    `;
    if (!existingUser.length) {
      return Response.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    const activeToken = await sql`
      SELECT identifier
      FROM auth_verification_token
      WHERE identifier = ${normalizedEmail}
        AND token = ${normalizedToken}
        AND expires > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    if (activeToken.length) {
      await sql`
        UPDATE auth_users
        SET "emailVerified" = CURRENT_TIMESTAMP
        WHERE email = ${normalizedEmail}
      `;
      await sql`
        DELETE FROM auth_verification_token
        WHERE identifier = ${normalizedEmail} AND token = ${normalizedToken}
      `;
      return Response.json({ success: true });
    }

    // Idempotent success: if already verified, repeated visits should not show failure.
    if (existingUser[0].emailVerified) {
      return Response.json({ success: true, alreadyVerified: true });
    }

    return Response.json({ error: "Invalid or expired link" }, { status: 400 });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
