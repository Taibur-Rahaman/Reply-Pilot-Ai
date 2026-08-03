import { NextResponse } from "next/server";
import { storeOrder, validateOrder } from "@/lib/bot/orders";

export const runtime = "nodejs";

/** Normalize order payload → local jsonl + optional ORDERS_WEBHOOK_URL. */
export async function POST(request: Request) {
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
