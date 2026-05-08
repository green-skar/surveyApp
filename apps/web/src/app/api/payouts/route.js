import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { ensureUserBalance } from "@/app/api/utils/ensureUserBalance";
import { PAYOUT_THRESHOLD_CENTS } from "@/constants/tiers";
import {
  createLogger,
  errorMeta,
  getRequestFromRouteArg,
  getRequestId,
} from "@/lib/logger";

export async function GET(arg) {
  const request = getRequestFromRouteArg(arg);
  const log = createLogger("api_payouts", {
    requestId: getRequestId(request),
    method: "GET",
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payouts = await sql`
      SELECT p.*, pm.type as method_type
      FROM payouts p
      LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.user_id = ${session.user.id}
      ORDER BY p.requested_at DESC
    `;
    return Response.json(payouts);
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  const log = createLogger("api_payouts", {
    requestId: getRequestId(request),
    method: "POST",
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { paymentMethodId } = await request.json();

    const profRows =
      await sql`SELECT identity_verified_at FROM profiles WHERE user_id = ${userId}`;
    if (!profRows[0]?.identity_verified_at) {
      return Response.json(
        {
          error:
            "Complete identity verification in Settings before requesting a payout.",
        },
        { status: 403 },
      );
    }

    await ensureUserBalance(userId);

    const ubRows =
      await sql`SELECT available_balance_cents, lifetime_earnings_cents FROM user_balances WHERE user_id = ${userId}`;
    if (!ubRows.length) {
      return Response.json({ error: "Balance not found" }, { status: 400 });
    }

    const { available_balance_cents, lifetime_earnings_cents } = ubRows[0];

    if (lifetime_earnings_cents < PAYOUT_THRESHOLD_CENTS) {
      return Response.json(
        {
          error: `You need $${PAYOUT_THRESHOLD_CENTS / 100} lifetime earnings to cash out`,
        },
        { status: 400 },
      );
    }

    if (available_balance_cents <= 0) {
      return Response.json(
        { error: "No available balance to withdraw" },
        { status: 400 },
      );
    }

    const amountDollars = available_balance_cents / 100;

    await sql.begin(async (tx) => {
      await tx`
        SELECT 1 FROM user_balances WHERE user_id = ${userId} FOR UPDATE
      `;
      await tx`
        INSERT INTO payouts (user_id, amount, payment_method_id)
        VALUES (${userId}, ${amountDollars}, ${paymentMethodId})
      `;
      await tx`
        UPDATE user_balances
        SET
          available_balance_cents = 0,
          total_paid_out_cents = total_paid_out_cents + ${available_balance_cents},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `;
      await tx`
        UPDATE profiles SET balance = 0 WHERE user_id = ${userId}
      `;
    });

    return Response.json({ success: true });
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
