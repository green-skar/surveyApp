import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET() {
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
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
