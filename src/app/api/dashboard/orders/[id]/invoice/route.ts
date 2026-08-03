import { NextResponse } from "next/server";
import {
  getBotConfig,
  getOrder,
  getSessionFromRequest,
  renderInvoiceHtml,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const order = await getOrder(session.tenantId, id);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  const config = await getBotConfig(session.tenantId);
  const html = renderInvoiceHtml(
    order,
    config?.businessName || "FaceTai Demo Store",
  );
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
