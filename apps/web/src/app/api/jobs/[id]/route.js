import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { ensureUserBalance } from "@/app/api/utils/ensureUserBalance";
import { tierLevel } from "@/constants/tiers";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function GET(request, { params }) {
  const log = createLogger("api_jobs_by_id", {
    requestId: getRequestId(request),
    jobId: params?.id ?? null,
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const userId = session.user.id;

    const jobs = await sql`SELECT * FROM jobs WHERE id = ${id}`;
    if (jobs.length === 0) {
      return Response.json({ error: "Job not found" }, { status: 404 });
    }
    const job = jobs[0];

    await ensureUserBalance(userId);
    const balanceRows =
      await sql`SELECT current_tier FROM user_balances WHERE user_id = ${userId}`;
    const currentTier = balanceRows[0]?.current_tier ?? "tier_1";
    const requiredTier = job.required_tier ?? "tier_1";
    const hasAccess = tierLevel(currentTier) >= tierLevel(requiredTier);

    const tasks = await sql`
      SELECT t.*, ut.status as user_status
      FROM tasks t
      LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ${userId}
      WHERE t.job_id = ${id}
      ORDER BY t.id ASC
    `;

    const total_reward_cents = tasks.reduce((sum, t) => {
      const cents =
        t.reward_cents != null
          ? Number(t.reward_cents)
          : Math.round(Number(t.reward) * 100);
      return sum + cents;
    }, 0);

    const jobWithTotals = {
      ...job,
      total_reward_cents,
      total_reward: total_reward_cents / 100,
    };

    return Response.json({
      job: jobWithTotals,
      tasks,
      hasAccess,
      currentTier,
      requiredTier,
    });
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
