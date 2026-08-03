"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  name: string;
  phone: string;
  product: string;
  qty: string;
  trackingStatus: string;
  courierNote?: string;
  courierName?: string;
  trackingNumber?: string;
  invoiceNumber?: string;
  address?: string;
  unitPrice?: number;
  createdAt: string;
};

const STATUSES = [
  "new",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "unknown",
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    product: "",
    qty: "1",
    address: "",
    unitPrice: "",
    courierName: "",
    trackingNumber: "",
  });
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/orders");
    const data = await res.json();
    if (res.ok) setOrders(data.orders || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setStatus("Creating…");
    const res = await fetch("/api/dashboard/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
        trackingStatus: "new",
      }),
    });
    const data = await res.json();
    setStatus(res.ok ? `Created ${data.order?.invoiceNumber}` : data.error);
    if (res.ok) {
      setForm({
        name: "",
        phone: "",
        product: "",
        qty: "1",
        address: "",
        unitPrice: "",
        courierName: "",
        trackingNumber: "",
      });
      await load();
    }
  }

  async function updateTracking(
    id: string,
    trackingStatus: string,
    extra?: Partial<Order>,
  ) {
    await fetch("/api/dashboard/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, trackingStatus, ...extra }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">AI Order Management</h1>
      <p className="dash__lead">
        Create orders, update courier tracking, open printable invoices. Buyers
        can ask “আমার অর্ডার কোথায়?” in Messenger.
      </p>

      <form className="dash-panel dash-form-grid" onSubmit={create}>
        <h2>Create order</h2>
        <label className="field">
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="017XXXXXXXX"
          />
        </label>
        <label className="field">
          <span>Product</span>
          <input
            required
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Qty</span>
          <input
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Unit price (৳)</span>
          <input
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Address</span>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Courier</span>
          <input
            value={form.courierName}
            onChange={(e) => setForm({ ...form, courierName: e.target.value })}
            placeholder="Steadfast / Pathao / RedX"
          />
        </label>
        <label className="field">
          <span>Tracking #</span>
          <input
            value={form.trackingNumber}
            onChange={(e) =>
              setForm({ ...form, trackingNumber: e.target.value })
            }
          />
        </label>
        <button className="btn btn--primary" type="submit">
          Create order
        </button>
        {status ? <p className="dash__muted">{status}</p> : null}
      </form>

      <div className="dash-table-wrap dash-panel">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Tracking</th>
              <th>Courier</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <code>{o.invoiceNumber || o.id.slice(0, 10)}</code>
                </td>
                <td>
                  {o.name}
                  <br />
                  <small>{o.phone}</small>
                </td>
                <td>
                  {o.product} × {o.qty}
                </td>
                <td>
                  <select
                    value={o.trackingStatus}
                    onChange={(e) => updateTracking(o.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    defaultValue={o.courierName || ""}
                    placeholder="Courier"
                    onBlur={(e) =>
                      updateTracking(o.id, o.trackingStatus, {
                        courierName: e.target.value,
                      })
                    }
                  />
                  <input
                    defaultValue={o.trackingNumber || ""}
                    placeholder="Tracking #"
                    onBlur={(e) =>
                      updateTracking(o.id, o.trackingStatus, {
                        trackingNumber: e.target.value,
                      })
                    }
                  />
                </td>
                <td>
                  <a
                    className="btn btn--ghost"
                    href={`/api/dashboard/orders/${o.id}/invoice`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Print
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? (
          <p className="dash__muted">No orders yet.</p>
        ) : null}
      </div>
    </div>
  );
}
