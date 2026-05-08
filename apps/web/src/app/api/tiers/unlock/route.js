import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { ensureUserBalance } from "@/app/api/utils/ensureUserBalance";
import {
  TIER_2_COST_CENTS,
  TIER_3_COST_CENTS,
  tierLevel,
} from "@/constants/tiers";
import { createLogger, errorMeta, getRequestId } from "@/lib/logger";

export async function POST(request) {
  const log = createLogger("api_tiers_unlock", {
    requestId: getRequestId(request),
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const tier = body?.tier;

    if (tier !== "tier_2" && tier !== "tier_3") {
      return Response.json({ error: "Invalid tier" }, { status: 400 });
    }

    const cost = tier === "tier_2" ? TIER_2_COST_CENTS : TIER_3_COST_CENTS;

    await ensureUserBalance(userId);

    const rows =
      await sql`SELECT current_tier, available_balance_cents FROM user_balances WHERE user_id = ${userId}`;
    if (!rows.length) {
      return Response.json({ error: "Balance not found" }, { status: 400 });
    }

    const { current_tier, available_balance_cents } = rows[0];
    const currentLvl = tierLevel(current_tier);
    const targetLvl = tierLevel(tier);

    if (currentLvl >= targetLvl) {
      return Response.json({ error: "Tier already unlocked" }, { status: 400 });
    }
    if (tier === "tier_3" && currentLvl < 2) {
      return Response.json(
        { error: "Unlock Tier 2 before Tier 3" },
        { status: 400 },
      );
    }
    if (available_balance_cents < cost) {
      return Response.json(
        { error: "Not enough available balance to unlock this tier" },
        { status: 400 },
      );
    }

    await sql.begin(async (tx) => {
      await tx`
        SELECT 1 FROM user_balances WHERE user_id = ${userId} FOR UPDATE
      `;
      await tx`
        UPDATE user_balances
        SET
          available_balance_cents = available_balance_cents - ${cost},
          current_tier = ${tier},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `;
      await tx`
        INSERT INTO tier_unlocks (user_id, tier, cost_cents)
        VALUES (${userId}, ${tier}, ${cost})
        ON CONFLICT (user_id, tier) DO NOTHING
      `;
      await tx`
        UPDATE profiles SET is_premium = ${tier !== "tier_1"}
        WHERE user_id = ${userId}
      `;
    });

    return Response.json({
      success: true,
      newTier: tier,
      newBalanceCents: available_balance_cents - cost,
    });
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
