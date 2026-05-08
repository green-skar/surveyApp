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
  const log = createLogger("api_admin_jobs", {
    requestId: getRequestId(request),
  });
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const rows = await sql`
      SELECT j.id, j.title, j.category, j.required_tier, j.is_active,
        (SELECT count(*)::int FROM tasks t WHERE t.job_id = j.id) AS task_count
      FROM jobs j
      ORDER BY j.id DESC
      LIMIT 200
    `;
    return Response.json(rows);
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
