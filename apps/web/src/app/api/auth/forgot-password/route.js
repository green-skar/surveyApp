import { randomBytes } from "node:crypto";
import sql from "@/app/api/utils/sql";
import { sendPasswordResetEmail } from "@/lib/sendPasswordResetEmail";

const RESET_PREFIX = "password-reset:";

export async function POST(request) {
  try {
    const body = await request.json();
    const raw = String(body?.email || "").trim().toLowerCase();
    if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return Response.json({ error: "Valid email is required" }, { status: 400 });
    }

    const users = await sql`SELECT id, email FROM auth_users WHERE email = ${raw}`;
    const user = users[0];

    if (user) {
      const identifier = `${RESET_PREFIX}${raw}`;
      await sql`DELETE FROM auth_verification_token WHERE identifier = ${identifier}`;

      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000);

      await sql`
        INSERT INTO auth_verification_token (identifier, expires, token)
        VALUES (${identifier}, ${expires}, ${token})
      `;

      await sendPasswordResetEmail({
        to: user.email,
        token,
        email: raw,
      });
    }

    return Response.json({
      ok: true,
      message:
        "If an account exists for that email, we sent password reset instructions.",
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
