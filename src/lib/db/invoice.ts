import type { Order } from "./types";

export function ensureInvoiceNumber(order: Order): string {
  if (order.invoiceNumber) return order.invoiceNumber;
  const short = order.id.replace(/^ord_/, "").slice(0, 8).toUpperCase();
  return `INV-${short}`;
}

export function orderLineTotal(order: Order): number {
  const qty = Number(order.qty) || 1;
  const unit = order.unitPrice ?? 0;
  return qty * unit;
}

/** Printable HTML invoice (browser print → PDF). */
export function renderInvoiceHtml(
  order: Order,
  businessName = "ReplyPilot AI Demo Store",
): string {
  const invoiceNo = ensureInvoiceNumber(order);
  const qty = Number(order.qty) || 1;
  const unit = order.unitPrice ?? 0;
  const total = qty * unit;
  const issued = new Date(order.createdAt).toLocaleString("en-BD");

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoiceNo}</title>
  <style>
    body { font-family: Georgia, "Noto Serif Bengali", serif; margin: 40px; color: #1a1a1a; }
    h1 { font-size: 1.6rem; margin: 0 0 4px; }
    .muted { color: #666; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #ddd; padding: 10px 8px; text-align: left; }
    th { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
    .total { font-size: 1.2rem; font-weight: bold; }
    .actions { margin-top: 28px; }
    @media print { .actions { display: none; } body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(businessName)}</h1>
  <p class="muted">Invoice · ReplyPilot AI Order Management</p>
  <p><strong>Invoice #</strong> ${escapeHtml(invoiceNo)}<br/>
  <strong>Date</strong> ${escapeHtml(issued)}<br/>
  <strong>Order</strong> ${escapeHtml(order.id)}</p>
  <p><strong>Bill to</strong><br/>
  ${escapeHtml(order.name)}<br/>
  ${escapeHtml(order.phone)}
  ${order.address ? `<br/>${escapeHtml(order.address)}` : ""}</p>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>${escapeHtml(order.product)}</td>
        <td>${qty}</td>
        <td>৳${unit.toLocaleString("en-BD")}</td>
        <td>৳${total.toLocaleString("en-BD")}</td>
      </tr>
    </tbody>
  </table>
  <p class="total">Total: ৳${total.toLocaleString("en-BD")}</p>
  <p class="muted">Tracking: ${escapeHtml(order.trackingStatus)}
  ${order.courierName ? ` · ${escapeHtml(order.courierName)}` : ""}
  ${order.trackingNumber ? ` · ${escapeHtml(order.trackingNumber)}` : ""}</p>
  <div class="actions">
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
