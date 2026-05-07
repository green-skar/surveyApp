import { auth } from "@/auth";

/** @deprecated Use POST /api/tiers/unlock with tier tier_2 or tier_3 */
export async function POST(request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(
    {
      error: "Premium unlock has moved. Use Tier access at /tiers.",
      redirect: "/tiers",
    },
    { status: 410 },
  );
}
