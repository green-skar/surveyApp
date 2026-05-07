import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const tasks = await sql`
      SELECT 
        ut.id,
        ut.status,
        ut.reward_earned,
        ut.started_at,
        ut.completed_at,
        t.id AS task_id,
        t.title AS task_title,
        t.description AS task_description,
        t.reward AS task_reward,
        t.time_limit_minutes,
        j.id AS job_id,
        j.title AS job_title,
        j.category,
        j.is_premium
      FROM user_tasks ut
      JOIN tasks t ON t.id = ut.task_id
      JOIN jobs j ON j.id = t.job_id
      WHERE ut.user_id = ${userId}
      ORDER BY ut.started_at DESC
    `;

    const summary = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COALESCE(SUM(reward_earned) FILTER (WHERE status = 'completed'), 0) AS total_earned
      FROM user_tasks
      WHERE user_id = ${userId}
    `;

    return Response.json({ tasks, summary: summary[0] });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
