import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
