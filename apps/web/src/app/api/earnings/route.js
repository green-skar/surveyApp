import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  createLogger,
  errorMeta,
  getRequestFromRouteArg,
  getRequestId,
} from "@/lib/logger";

export async function GET(arg) {
  const request = getRequestFromRouteArg(arg);
  const log = createLogger("api_earnings", {
    requestId: getRequestId(request),
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Daily earnings for the last 30 days
    const daily = await sql`
      SELECT
        DATE(completed_at) AS date,
        COUNT(*) AS tasks_completed,
        COALESCE(SUM(reward_earned), 0) AS total_earned
      FROM user_tasks
      WHERE user_id = ${userId}
        AND status = 'completed'
        AND completed_at IS NOT NULL
        AND completed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `;

    // This week earnings
    const thisWeek = await sql`
      SELECT COALESCE(SUM(reward_earned), 0) AS total
      FROM user_tasks
      WHERE user_id = ${userId}
        AND status = 'completed'
        AND completed_at >= DATE_TRUNC('week', NOW())
    `;

    // This month earnings
    const thisMonth = await sql`
      SELECT COALESCE(SUM(reward_earned), 0) AS total
      FROM user_tasks
      WHERE user_id = ${userId}
        AND status = 'completed'
        AND completed_at >= DATE_TRUNC('month', NOW())
    `;

    // All time earnings
    const allTime = await sql`
      SELECT COALESCE(SUM(reward_earned), 0) AS total, COUNT(*) AS task_count
      FROM user_tasks
      WHERE user_id = ${userId}
        AND status = 'completed'
    `;

    // Recent completed tasks (for history table)
    const recentTasks = await sql`
      SELECT
        ut.reward_earned,
        ut.completed_at,
        t.title AS task_title,
        j.title AS job_title,
        j.category
      FROM user_tasks ut
      JOIN tasks t ON t.id = ut.task_id
      JOIN jobs j ON j.id = t.job_id
      WHERE ut.user_id = ${userId}
        AND ut.status = 'completed'
      ORDER BY ut.completed_at DESC
      LIMIT 20
    `;

    return Response.json({
      daily,
      thisWeek: parseFloat(thisWeek[0]?.total || 0),
      thisMonth: parseFloat(thisMonth[0]?.total || 0),
      allTime: parseFloat(allTime[0]?.total || 0),
      taskCount: parseInt(allTime[0]?.task_count || 0),
      recentTasks,
    });
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
