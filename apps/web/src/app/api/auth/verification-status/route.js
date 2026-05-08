import sql from "@/app/api/utils/sql";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function POST(request) {
  const log = createLogger("api_auth_verification_status", {
    requestId: getRequestId(request),
  });
  try {
    const body = await request.json();
    const email = body?.email;
    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT "emailVerified" FROM auth_users WHERE email = ${email.trim()} LIMIT 1
    `;
    if (!rows.length) {
      return Response.json({
        status: "missing",
        verified: false,
      });
    }

    const verified = Boolean(rows[0].emailVerified);
    return Response.json({
      status: verified ? "verified" : "pending",
      verified,
    });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
