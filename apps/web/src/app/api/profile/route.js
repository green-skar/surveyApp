import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { ensureUserBalance } from "@/app/api/utils/ensureUserBalance";

function coerceInterests(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (val == null) return [];
  if (typeof val === "string") {
    const t = val.trim();
    if (t.startsWith("{") && t.endsWith("}")) {
      return t
        .slice(1, -1)
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((s) => s.replace(/^"(.*)"$/, "$1").trim())
        .filter(Boolean);
    }
    return t ? [t] : [];
  }
  return [];
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    let profiles = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;

    if (profiles.length === 0) {
      await sql`INSERT INTO profiles (user_id, full_name, country) VALUES (${userId}, NULL, NULL)`;
      profiles = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    }

    await ensureUserBalance(userId);
    const balanceRows =
      await sql`SELECT * FROM user_balances WHERE user_id = ${userId}`;
    const ub = balanceRows[0];

    const p = profiles[0];
    const verifiedAt = p.identity_verified_at ?? null;

    return Response.json({
      ...p,
      identityVerified: Boolean(verifiedAt),
      identityVerifiedAt: verifiedAt,
      available_balance_cents: ub?.available_balance_cents ?? 0,
      lifetime_earnings_cents: ub?.lifetime_earnings_cents ?? 0,
      current_tier: ub?.current_tier ?? "tier_1",
      tasks_completed: ub?.tasks_completed ?? 0,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    if (body.onboarded === true) {
      const payoutSkipped = Boolean(body.payout_setup_skipped);
      if (!payoutSkipped) {
        const pm =
          await sql`SELECT id FROM payment_methods WHERE user_id = ${userId} LIMIT 1`;
        if (pm.length === 0) {
          return Response.json(
            {
              error:
                "Add and verify a payout method before completing onboarding, or skip payout setup.",
            },
            { status: 400 },
          );
        }
      }
    }

    let rows = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    if (rows.length === 0) {
      await sql`INSERT INTO profiles (user_id, full_name, country) VALUES (${userId}, NULL, NULL)`;
      rows = await sql`SELECT * FROM profiles WHERE user_id = ${userId}`;
    }
    const row = rows[0];

    if (
      row.identity_verified_at &&
      body.full_name !== undefined &&
      String(body.full_name).trim() !== String(row.full_name ?? "").trim()
    ) {
      return Response.json(
        {
          error:
            "Verified accounts cannot change legal name here. Contact support if your name changed.",
        },
        { status: 400 },
      );
    }

    const next = {
      full_name:
        body.full_name !== undefined ? body.full_name : row.full_name ?? null,
      country: body.country !== undefined ? body.country : row.country ?? null,
      interests:
        body.interests !== undefined
          ? coerceInterests(body.interests)
          : coerceInterests(row.interests),
      payment_preference:
        body.payment_preference !== undefined
          ? body.payment_preference
          : row.payment_preference ?? "paypal",
      onboarded:
        body.onboarded !== undefined
          ? Boolean(body.onboarded)
          : Boolean(row.onboarded),
      payout_setup_skipped:
        body.payout_setup_skipped !== undefined
          ? Boolean(body.payout_setup_skipped)
          : Boolean(row.payout_setup_skipped ?? false),
    };

    let result;
    try {
      result = await sql`
        UPDATE profiles SET
          full_name = ${next.full_name},
          country = ${next.country},
          interests = ${next.interests},
          payment_preference = ${next.payment_preference},
          onboarded = ${next.onboarded},
          payout_setup_skipped = ${next.payout_setup_skipped}
        WHERE user_id = ${userId}
        RETURNING *
      `;
    } catch (e) {
      if (
        String(e?.message || "").includes("payout_setup_skipped") ||
        String(e?.code || "") === "42703"
      ) {
        result = await sql`
          UPDATE profiles SET
            full_name = ${next.full_name},
            country = ${next.country},
            interests = ${next.interests},
            payment_preference = ${next.payment_preference},
            onboarded = ${next.onboarded}
          WHERE user_id = ${userId}
          RETURNING *
        `;
      } else {
        throw e;
      }
    }

    await ensureUserBalance(userId);
    const balanceRows =
      await sql`SELECT * FROM user_balances WHERE user_id = ${userId}`;
    const ub = balanceRows[0];

    const r = result[0];
    const verifiedAt = r.identity_verified_at ?? null;

    return Response.json({
      ...r,
      identityVerified: Boolean(verifiedAt),
      identityVerifiedAt: verifiedAt,
      available_balance_cents: ub?.available_balance_cents ?? 0,
      lifetime_earnings_cents: ub?.lifetime_earnings_cents ?? 0,
      current_tier: ub?.current_tier ?? "tier_1",
      tasks_completed: ub?.tasks_completed ?? 0,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
