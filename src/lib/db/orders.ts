import { WHATSAPP_DISPLAY } from "@/lib/config";
import { newId, toIso } from "./ids";
import { prisma } from "./prisma";
import { appendTimelineEvent } from "./timeline";
import {
  DEFAULT_TENANT_ID,
  type Order,
  type OrderTrackingStatus,
} from "./types";

export type OrderPayload = {
  tenantId?: string;
  pageId?: string;
  senderId: string;
  name: string;
  phone: string;
  product: string;
  qty?: string;
  notes?: string;
  status?: string;
  trackingStatus?: OrderTrackingStatus;
  courierNote?: string;
  courierName?: string;
  trackingNumber?: string;
  address?: string;
  unitPrice?: number;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

function mapOrder(o: {
  id: string;
  tenantId: string;
  pageId: string | null;
  senderId: string;
  name: string;
  phone: string;
  product: string;
  qty: string;
  notes: string | null;
  status: string;
  trackingStatus: string;
  courierNote: string | null;
  courierName: string | null;
  trackingNumber: string | null;
  address: string | null;
  unitPrice: number | null;
  invoiceNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Order {
  return {
    id: o.id,
    tenantId: o.tenantId,
    pageId: o.pageId || undefined,
    senderId: o.senderId,
    name: o.name,
    phone: o.phone,
    product: o.product,
    qty: o.qty,
    notes: o.notes || undefined,
    status: o.status,
    trackingStatus: o.trackingStatus as OrderTrackingStatus,
    courierNote: o.courierNote || undefined,
    courierName: o.courierName || undefined,
    trackingNumber: o.trackingNumber || undefined,
    address: o.address || undefined,
    unitPrice: o.unitPrice ?? undefined,
    invoiceNumber: o.invoiceNumber || undefined,
    createdAt: toIso(o.createdAt),
    updatedAt: toIso(o.updatedAt),
  };
}

export function validateOrder(input: unknown): {
  ok: true;
  data: OrderPayload;
} | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid order body." };
  }

  const body = input as Record<string, unknown>;
  const senderId = String(body.senderId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(String(body.phone ?? ""));
  const product = String(body.product ?? "").trim();
  const qty = String(body.qty ?? "1").trim() || "1";
  const notes = String(body.notes ?? "").trim();
  const pageId = String(body.pageId ?? "").trim();
  const status = String(body.status ?? "new").trim() || "new";
  const tenantId = String(body.tenantId ?? DEFAULT_TENANT_ID).trim();
  const trackingStatus = (String(
    body.trackingStatus ?? "new",
  ).trim() || "new") as OrderTrackingStatus;
  const courierNote = String(body.courierNote ?? "").trim() || undefined;
  const courierName = String(body.courierName ?? "").trim() || undefined;
  const trackingNumber = String(body.trackingNumber ?? "").trim() || undefined;
  const address = String(body.address ?? "").trim() || undefined;
  const unitPrice =
    body.unitPrice !== undefined && body.unitPrice !== ""
      ? Number(body.unitPrice)
      : undefined;

  if (!senderId) return { ok: false, error: "senderId is required." };
  if (name.length < 2) return { ok: false, error: "Customer name is required." };
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Valid phone is required." };
  }
  if (product.length < 1) return { ok: false, error: "Product is required." };

  return {
    ok: true,
    data: {
      tenantId,
      senderId,
      name,
      phone,
      product,
      qty,
      notes: notes || undefined,
      pageId: pageId || undefined,
      status,
      trackingStatus,
      courierNote,
      courierName,
      trackingNumber,
      address,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : undefined,
    },
  };
}

export async function postOrderWebhook(order: Order) {
  const url =
    process.env.ORDERS_WEBHOOK_URL?.trim() ||
    process.env.ORDERS_SHEET_WEBHOOK_URL?.trim();
  if (!url) return { sent: false as const };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    throw new Error(`Orders webhook failed with status ${response.status}`);
  }
  return { sent: true as const };
}

export async function storeOrder(payload: OrderPayload): Promise<Order> {
  const now = new Date();
  const id = newId("ord");
  const short = id.replace(/^ord_/, "").slice(0, 8).toUpperCase();
  const order = await prisma.order.create({
    data: {
      id,
      tenantId: payload.tenantId || DEFAULT_TENANT_ID,
      pageId: payload.pageId,
      senderId: payload.senderId,
      name: payload.name,
      phone: payload.phone,
      product: payload.product,
      qty: payload.qty || "1",
      notes: payload.notes,
      status: payload.status || "new",
      trackingStatus: payload.trackingStatus || "new",
      courierNote: payload.courierNote,
      courierName: payload.courierName,
      trackingNumber: payload.trackingNumber,
      address: payload.address,
      unitPrice: payload.unitPrice,
      invoiceNumber: `INV-${short}`,
      createdAt: now,
      updatedAt: now,
    },
  });
  const mapped = mapOrder(order);
  await appendTimelineEvent({
    tenantId: mapped.tenantId,
    senderId: mapped.senderId,
    type: "order",
    title: `Order ${mapped.invoiceNumber}`,
    body: `${mapped.product} × ${mapped.qty}`,
    refId: mapped.id,
  }).catch(() => undefined);

  try {
    await postOrderWebhook(mapped);
  } catch (error) {
    console.error("[orders] webhook error:", error);
  }

  return mapped;
}

export async function listOrders(tenantId: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapOrder);
}

export async function updateOrderTracking(
  tenantId: string,
  orderId: string,
  trackingStatus: OrderTrackingStatus,
  courierNote?: string,
  extra?: {
    courierName?: string;
    trackingNumber?: string;
    status?: string;
  },
): Promise<Order | null> {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });
  if (!existing) return null;
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      trackingStatus,
      ...(courierNote !== undefined ? { courierNote } : {}),
      ...(extra?.courierName !== undefined
        ? { courierName: extra.courierName }
        : {}),
      ...(extra?.trackingNumber !== undefined
        ? { trackingNumber: extra.trackingNumber }
        : {}),
      ...(extra?.status !== undefined ? { status: extra.status } : {}),
    },
  });
  return mapOrder(order);
}

export async function getOrder(
  tenantId: string,
  orderId: string,
): Promise<Order | null> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });
  return order ? mapOrder(order) : null;
}

export async function findOrdersByPhone(
  tenantId: string,
  phone: string,
): Promise<Order[]> {
  const digits = phone.replace(/\D/g, "");
  const rows = await prisma.order.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows
    .filter((o) => o.phone.replace(/\D/g, "").endsWith(digits.slice(-11)))
    .map(mapOrder);
}

export async function findLatestOrderForSender(
  tenantId: string,
  senderId: string,
): Promise<Order | null> {
  const order = await prisma.order.findFirst({
    where: { tenantId, senderId },
    orderBy: { createdAt: "desc" },
  });
  return order ? mapOrder(order) : null;
}

export function tryParseOrderFromText(
  text: string,
  senderId: string,
  pageId?: string,
  tenantId?: string,
): OrderPayload | null {
  const lower = text.toLowerCase();
  const wantsOrder =
    /অর্ডার|order|কিনতে|নিতে চাই|place order/.test(lower) ||
    /অর্ডার/.test(text);

  if (!wantsOrder) return null;

  const phoneMatch = text.match(/(?:\+?88)?01[3-9]\d{8}/);
  const phone = phoneMatch?.[0];
  if (!phone) return null;

  const nameMatch =
    text.match(/(?:নাম|name)\s*[:：\-]\s*([^\n,|]+)/i) ||
    text.match(/(?:আমি|I am|I'm)\s+([A-Za-zআ-হ\s]{2,40})/i);
  const name = nameMatch?.[1]?.trim() || "Messenger customer";

  const productMatch =
    text.match(/(?:প্রোডাক্ট|product|item)\s*[:：\-]\s*([^\n,|]+)/i) ||
    text.match(/(?:চাই|want)\s+([^\n.]{2,60})/i);
  const product = productMatch?.[1]?.trim() || "See chat notes";

  const qtyMatch = text.match(/(?:qty|পরিমাণ|পিস)\s*[:：\-]?\s*(\d+)/i);
  const qty = qtyMatch?.[1] || "1";

  return {
    tenantId: tenantId || DEFAULT_TENANT_ID,
    senderId,
    pageId,
    name,
    phone,
    product,
    qty,
    notes: text.slice(0, 500),
    status: "new",
    trackingStatus: "new",
  };
}

export function wantsOrderTracking(text: string): boolean {
  return /অর্ডার.*(কোথায়|কোথায়|কই|ট্র্যাক|status|track)|where.*(order|my order)|order status|ট্র্যাকিং/i.test(
    text,
  );
}

export function formatTrackingReply(order: Order): string {
  const label: Record<OrderTrackingStatus, string> = {
    new: "নতুন — টিম কনফার্ম করবে",
    confirmed: "কনফার্ম হয়েছে",
    packed: "প্যাক করা হয়েছে",
    shipped: "কুরিয়ারে উঠেছে",
    delivered: "ডেলিভার হয়েছে",
    cancelled: "ক্যানসেল",
    unknown: "স্ট্যাটাস এখনো আপডেট হয়নি",
  };
  return [
    `অর্ডার আপডেট ✓`,
    `ID: ${order.id.slice(0, 10)}`,
    order.invoiceNumber ? `Invoice: ${order.invoiceNumber}` : null,
    `প্রোডাক্ট: ${order.product}`,
    `স্ট্যাটাস: ${label[order.trackingStatus] || order.trackingStatus}`,
    order.courierName ? `কুরিয়ার: ${order.courierName}` : null,
    order.trackingNumber ? `ট্র্যাকিং #: ${order.trackingNumber}` : null,
    order.courierNote ? `নোট: ${order.courierNote}` : null,
    "",
    `আরও জানতে চাইলে লিখুন — অথবা WhatsApp ${WHATSAPP_DISPLAY}।`,
  ]
    .filter(Boolean)
    .join("\n");
}
