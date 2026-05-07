import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, email } = body ?? {};
    if (!token || !email || typeof token !== "string" || typeof email !== "string") {
      return Response.json({ error: "Token and email are required" }, { status: 400 });
    }

    const used = await sql`
      DELETE FROM auth_verification_token
      WHERE identifier = ${email} AND token = ${token}
      RETURNING identifier
    `;

    if (!used.length) {
      return Response.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    await sql`
      UPDATE auth_users
      SET "emailVerified" = CURRENT_TIMESTAMP
      WHERE email = ${email}
    `;

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
