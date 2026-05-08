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
  const log = createLogger("api_admin_payouts", {
    requestId: getRequestId(request),
  });
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const rows = await sql`
      SELECT p.id, p.user_id, p.amount, p.status, p.requested_at, p.processed_at,
        pm.type AS method_type
      FROM payouts p
      LEFT JOIN payment_methods pm ON pm.id = p.payment_method_id
      ORDER BY p.requested_at DESC
      LIMIT 200
    `;
    return Response.json(rows);
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
