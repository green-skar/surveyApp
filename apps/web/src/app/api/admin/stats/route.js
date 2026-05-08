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
  const log = createLogger("api_admin_stats", {
    requestId: getRequestId(request),
  });
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const [activeTaskers, jobs, tasks, payouts, contacts] = await Promise.all([
      sql`SELECT count(*)::int AS c FROM auth_users WHERE "emailVerified" IS NOT NULL`,
      sql`SELECT count(*)::int AS c FROM jobs`,
      sql`SELECT count(*)::int AS c FROM tasks`,
      sql`SELECT count(*)::int AS c FROM payouts`,
      sql`SELECT count(*)::int AS c FROM contact_submissions`,
    ]);

    return Response.json({
      activeTaskers: activeTaskers[0]?.c ?? 0,
      jobs: jobs[0]?.c ?? 0,
      tasks: tasks[0]?.c ?? 0,
      payouts: payouts[0]?.c ?? 0,
      contactSubmissions: contacts[0]?.c ?? 0,
    });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
