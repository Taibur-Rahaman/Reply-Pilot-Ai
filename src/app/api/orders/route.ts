import { NextResponse } from "next/server";
import { storeOrder, validateOrder } from "@/lib/bot/orders";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Normalize order payload → local jsonl + optional ORDERS_WEBHOOK_URL. */
export async function POST(request: Request) {
  const rl = checkRateLimit(`orders:${getClientIp(request)}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec!);

  try {
    const body = await request.json();
    const validated = validateOrder(body);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const order = await storeOrder(validated.data);
    return NextResponse.json({ ok: true, id: order.id, order });
  } catch (error) {
    console.error("[api/orders]", error);
    return NextResponse.json(
      { error: "Could not save order." },
      { status: 500 },
    );
  }
}
