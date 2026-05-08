import { hash, verify } from "argon2";
import pool from "@/lib/pgPool";
import { requireAdmin } from "@/app/api/utils/requireAdmin";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function POST(request) {
  const log = createLogger("api_admin_credentials", {
    requestId: getRequestId(request),
  });
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const session = gate.session;
  const adminDbId = session.user.adminDbId;
  if (adminDbId == null) {
    return Response.json({ error: "Invalid admin session" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newUsername =
      typeof body?.newUsername === "string" ? body.newUsername.trim() : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newUsername || !newPassword) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }
    if (newUsername.length < 3) {
      return Response.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return Response.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const r = await pool.query(
      `SELECT id, username, password_hash, must_change_password FROM app_admins WHERE id = $1`,
      [adminDbId],
    );
    if (r.rowCount === 0) {
      return Response.json({ error: "Admin not found" }, { status: 404 });
    }
    const row = r.rows[0];
    const valid = await verify(row.password_hash, currentPassword);
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    const clash = await pool.query(
      `SELECT id FROM app_admins WHERE lower(username) = lower($1) AND id <> $2`,
      [newUsername, adminDbId],
    );
    if (clash.rowCount > 0) {
      return Response.json({ error: "That username is already taken" }, { status: 409 });
    }

    const password_hash = await hash(newPassword);
    await pool.query(
      `UPDATE app_admins SET username = $1, password_hash = $2, must_change_password = false, updated_at = now() WHERE id = $3`,
      [newUsername, password_hash, adminDbId],
    );

    return Response.json({ ok: true });
  } catch (e) {
    log.error("handler_failed", errorMeta(e));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
