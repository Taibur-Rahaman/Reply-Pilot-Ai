import { NextResponse } from "next/server";
import {
  getSessionFromRequest,
  listOrders,
  storeOrder,
  TRACKING_STATUSES,
  type OrderTrackingStatus,
  updateOrderTracking,
  validateOrder,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const orders = await listOrders(session.tenantId);
  return NextResponse.json({
    ok: true,
    orders,
    trackingStatuses: TRACKING_STATUSES,
  });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const validated = validateOrder({
      ...body,
      tenantId: session.tenantId,
      senderId: body.senderId || `dash_${Date.now()}`,
    });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const order = await storeOrder(validated.data);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    console.error("[api/dashboard/orders]", error);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      trackingStatus?: OrderTrackingStatus;
      courierNote?: string;
      courierName?: string;
      trackingNumber?: string;
      status?: string;
    };
    if (!body.id || !body.trackingStatus) {
      return NextResponse.json(
        { error: "id and trackingStatus required." },
        { status: 400 },
      );
    }
    if (!TRACKING_STATUSES.includes(body.trackingStatus)) {
      return NextResponse.json(
        { error: "Invalid trackingStatus." },
        { status: 400 },
      );
    }
    const order = await updateOrderTracking(
      session.tenantId,
      body.id,
      body.trackingStatus,
      body.courierNote,
      {
        courierName: body.courierName,
        trackingNumber: body.trackingNumber,
        status: body.status,
      },
    );
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    console.error("[api/dashboard/orders]", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
