import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import {
  createLogger,
  errorMeta,
  getRequestFromRouteArg,
  getRequestId,
} from "@/lib/logger";

export async function GET(arg) {
  const request = getRequestFromRouteArg(arg);
  const log = createLogger("api_payment_methods", {
    requestId: getRequestId(request),
    method: "GET",
  });
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const methods =
      await sql`SELECT * FROM payment_methods WHERE user_id = ${session.user.id}`;
    return Response.json(methods);
  } catch (error) {
    log.error("handler_failed", errorMeta(error));
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(arg) {
  const request = getRequestFromRouteArg(arg);
  const log = createLogger("api_payment_methods", {
    requestId: getRequestId(request),
    method: "POST",
  });
  log.warn("method_not_allowed", {
    message: "POST not supported on this route; use request-otp / verify-otp",
  });
  return Response.json(
    {
      error:
        "Payout methods must be verified by email code. Use POST /api/payment-methods/request-otp then /api/payment-methods/verify-otp.",
    },
    { status: 405, headers: { Allow: "GET" } },
  );
}
