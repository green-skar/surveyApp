import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "Not available in production." }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(session.user.id);
    const now = new Date().toISOString();

    await sql`INSERT INTO profiles (user_id, full_name, country)
      VALUES (${userId}, NULL, NULL)
      ON CONFLICT (user_id) DO NOTHING`;

    await sql`
      UPDATE profiles
      SET
        identity_verified_at = ${now},
        identity_verified_name_snapshot = COALESCE(identity_verified_name_snapshot, full_name, 'Development User'),
        identity_document_kind = COALESCE(identity_document_kind, 'dev_skip'),
        identity_last_submitted_at = ${now}
      WHERE user_id = ${userId}
    `;

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
