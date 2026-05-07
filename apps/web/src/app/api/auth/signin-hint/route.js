import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email;
    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT u."emailVerified", a.id AS account_id
      FROM auth_users u
      LEFT JOIN auth_accounts a
        ON a."userId" = u.id AND a.provider = 'credentials'
      WHERE u.email = ${email}
      LIMIT 1
    `;

    if (!rows.length || !rows[0].account_id) {
      return Response.json({ hint: "invalid_credentials" });
    }
    if (!rows[0].emailVerified) {
      return Response.json({ hint: "pending_verification" });
    }
    return Response.json({ hint: "invalid_credentials" });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
