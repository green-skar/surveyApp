import { randomBytes } from "node:crypto";
import sql from "@/app/api/utils/sql";
import { sendVerificationEmail } from "@/lib/sendVerificationEmail";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email;
    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const trimmed = email.trim();
    const users = await sql`
      SELECT id, email, "emailVerified" FROM auth_users WHERE email = ${trimmed}
    `;

    if (!users.length) {
      return Response.json(
        { error: "No account found for this email." },
        { status: 404 },
      );
    }

    if (users[0].emailVerified) {
      return Response.json({ ok: true, alreadyVerified: true });
    }

    await sql`DELETE FROM auth_verification_token WHERE identifier = ${trimmed}`;

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await sql`
      INSERT INTO auth_verification_token (identifier, expires, token)
      VALUES (${trimmed}, ${expires}, ${token})
    `;

    await sendVerificationEmail({ to: trimmed, token });

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
