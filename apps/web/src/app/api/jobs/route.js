import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { ensureUserBalance } from "@/app/api/utils/ensureUserBalance";
import { tierLevel } from "@/constants/tiers";
import {
  createLogger,
  errorMeta,
  getRequestFromRouteArg,
  getRequestId,
} from "@/lib/logger";

export async function GET(arg) {
  const request = getRequestFromRouteArg(arg);
  const log = createLogger("api_jobs", {
    requestId: getRequestId(request),
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await ensureUserBalance(userId);

    const [jobs, balanceRows, completionRows] = await Promise.all([
      sql`
        SELECT
          j.*,
          COALESCE(tc.cnt, 0)::int AS task_count,
          COALESCE(tc.total_reward_cents, 0)::int AS total_reward_cents
        FROM jobs j
        LEFT JOIN (
          SELECT
            job_id,
            COUNT(*)::int AS cnt,
            COALESCE(SUM(reward_cents), 0)::int AS total_reward_cents
          FROM tasks
          GROUP BY job_id
        ) tc ON tc.job_id = j.id
        WHERE j.is_active = true
        ORDER BY j.created_at DESC
      `,
      sql`
        SELECT current_tier FROM user_balances WHERE user_id = ${userId}
      `,
      sql`
        SELECT t.job_id AS job_id, COUNT(*)::int AS completed_count
        FROM user_tasks ut
        INNER JOIN tasks t ON t.id = ut.task_id
        WHERE ut.user_id = ${userId} AND ut.status = 'completed'
        GROUP BY t.job_id
      `,
    ]);

    const completedByJob = new Map(
      completionRows.map((r) => [r.job_id, r.completed_count]),
    );

    const currentTier = balanceRows[0]?.current_tier ?? "tier_1";

    const enriched = jobs.map((j) => {
      const required = j.required_tier ?? "tier_1";
      return {
        ...j,
        completed_count: completedByJob.get(j.id) ?? 0,
        locked: tierLevel(currentTier) < tierLevel(required),
        total_reward: Number(j.total_reward_cents ?? 0) / 100,
      };
    });

    return Response.json({
      jobs: enriched,
      currentTier,
    });
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
