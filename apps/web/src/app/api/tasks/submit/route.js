import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { ensureUserBalance } from "@/app/api/utils/ensureUserBalance";
import { tierLevel } from "@/constants/tiers";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function POST(request) {
  const log = createLogger("api_tasks_submit", {
    requestId: getRequestId(request),
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { taskId } = await request.json();

    if (!taskId) {
      return Response.json({ error: "Task ID is required" }, { status: 400 });
    }

    const tasks = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
    if (tasks.length === 0) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }
    const task = tasks[0];

    const jobs = await sql`SELECT * FROM jobs WHERE id = ${task.job_id}`;
    const job = jobs[0];

    await ensureUserBalance(userId);

    const balanceRows =
      await sql`SELECT current_tier FROM user_balances WHERE user_id = ${userId}`;
    const currentTier = balanceRows[0]?.current_tier ?? "tier_1";
    const requiredTier = job.required_tier ?? "tier_1";

    if (tierLevel(currentTier) < tierLevel(requiredTier)) {
      return Response.json(
        { error: "Your tier does not allow this task. Unlock a higher tier first." },
        { status: 403 },
      );
    }

    const existing =
      await sql`SELECT * FROM user_tasks WHERE user_id = ${userId} AND task_id = ${taskId}`;
    if (existing.length > 0 && existing[0].status === "completed") {
      return Response.json(
        { error: "Task already completed" },
        { status: 400 },
      );
    }

    const rewardCents =
      task.reward_cents != null
        ? Number(task.reward_cents)
        : Math.round(Number(task.reward) * 100);
    const rewardDollars = rewardCents / 100;

    const appliedRows = await sql`
      WITH changed AS (
        INSERT INTO user_tasks (user_id, task_id, status, reward_earned, completed_at)
        VALUES (${userId}, ${taskId}, 'completed', ${rewardDollars}, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, task_id) DO UPDATE SET
          status = 'completed',
          reward_earned = EXCLUDED.reward_earned,
          completed_at = EXCLUDED.completed_at
        WHERE user_tasks.status IS DISTINCT FROM 'completed'
        RETURNING 1
      ),
      balance_update AS (
        UPDATE user_balances
        SET
          available_balance_cents = available_balance_cents + ${rewardCents},
          lifetime_earnings_cents = lifetime_earnings_cents + ${rewardCents},
          tasks_completed = tasks_completed + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
          AND EXISTS (SELECT 1 FROM changed)
        RETURNING 1
      ),
      profile_update AS (
        UPDATE profiles
        SET balance = COALESCE(balance, 0) + ${rewardDollars}
        WHERE user_id = ${userId}
          AND EXISTS (SELECT 1 FROM changed)
        RETURNING 1
      )
      SELECT EXISTS (SELECT 1 FROM changed) AS applied
    `;

    if (!appliedRows[0]?.applied) {
      return Response.json(
        { error: "Task already completed" },
        { status: 400 },
      );
    }

    return Response.json({
      success: true,
      reward: rewardDollars,
      rewardCents,
    });
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
