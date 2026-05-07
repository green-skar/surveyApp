import sql from "@/app/api/utils/sql";

/** Ensure user_balances row exists (tier migration). */
export async function ensureUserBalance(userId) {
  await sql`
    INSERT INTO user_balances (user_id) VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;
}
