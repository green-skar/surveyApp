import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email;
    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT "emailVerified" FROM auth_users WHERE email = ${email} LIMIT 1
    `;
    if (!rows.length) {
      return Response.json({ verified: false }, { status: 200 });
    }

    return Response.json({ verified: Boolean(rows[0].emailVerified) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
