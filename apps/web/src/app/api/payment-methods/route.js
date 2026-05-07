import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const methods =
      await sql`SELECT * FROM payment_methods WHERE user_id = ${session.user.id}`;
    return Response.json(methods);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  return Response.json(
    {
      error:
        "Payout methods must be verified by email code. Use POST /api/payment-methods/request-otp then /api/payment-methods/verify-otp.",
    },
    { status: 405, headers: { Allow: "GET" } },
  );
}
