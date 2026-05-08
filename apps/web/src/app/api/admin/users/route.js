import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";
import {
  createLogger,
  errorMeta,
  getRequestFromRouteArg,
  getRequestId,
} from "@/lib/logger";

export async function GET(arg) {
  const request = getRequestFromRouteArg(arg);
  const log = createLogger("api_admin_users", {
    requestId: getRequestId(request),
  });
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const rows = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        (u."emailVerified" IS NOT NULL) AS email_verified,
        p.identity_verified_at
      FROM auth_users u
      LEFT JOIN profiles p ON p.user_id = u.id::text
      ORDER BY u.id DESC
      LIMIT 200
    `;
    return Response.json(rows);
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(arg) {
  const request = getRequestFromRouteArg(arg);
  const log = createLogger("api_admin_users", {
    requestId: getRequestId(request),
  });
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawId = body?.userId;
    const userId = typeof rawId === "string" ? Number.parseInt(rawId, 10) : Number(rawId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return Response.json({ error: "userId is required and must be a positive integer" }, { status: 400 });
    }

    const existing = await sql`
      SELECT id, "emailVerified" AS email_verified, email
      FROM auth_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (!existing.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const row = existing[0];
    if (row.email_verified) {
      return Response.json({ ok: true, alreadyVerified: true });
    }

    await sql`
      UPDATE auth_users
      SET "emailVerified" = CURRENT_TIMESTAMP
      WHERE id = ${userId} AND "emailVerified" IS NULL
    `;

    await sql`
      DELETE FROM auth_verification_token
      WHERE identifier = ${row.email}
    `;

    return Response.json({ ok: true });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
