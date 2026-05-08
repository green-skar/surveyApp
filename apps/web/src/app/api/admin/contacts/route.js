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
  const log = createLogger("api_admin_contacts", {
    requestId: getRequestId(request),
  });
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const rows = await sql`
      SELECT id, email, message, created_at
      FROM contact_submissions
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return Response.json(rows);
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
