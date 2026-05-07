import sql from "@/app/api/utils/sql";
import { requireAdmin } from "@/app/api/utils/requireAdmin";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const rows = await sql`
      SELECT id, email, message, created_at
      FROM contact_submissions
      ORDER BY created_at DESC
      LIMIT 200
    `;
    return Response.json(rows);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
