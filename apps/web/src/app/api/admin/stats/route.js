import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const [users, jobs, tasks, payouts, contacts] = await Promise.all([
      sql`SELECT count(*)::int AS c FROM auth_users`,
      sql`SELECT count(*)::int AS c FROM jobs`,
      sql`SELECT count(*)::int AS c FROM tasks`,
      sql`SELECT count(*)::int AS c FROM payouts`,
      sql`SELECT count(*)::int AS c FROM contact_submissions`,
    ]);

    return Response.json({
      users: users[0]?.c ?? 0,
      jobs: jobs[0]?.c ?? 0,
      tasks: tasks[0]?.c ?? 0,
      payouts: payouts[0]?.c ?? 0,
      contactSubmissions: contacts[0]?.c ?? 0,
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
