"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/friendly-errors";
import { useToast } from "@/components/ui/Toast";

/**
 * Customers — People and Orders.
 *
 * Merges three old screens: Leads/CRM, Complaints, and Orders. Every internal
 * enum is translated at the edge:
 *
 *   crmStage       new → "New", interested → "Interested", negotiating →
 *                  "Buying", won → "Bought", lost → "Not interested"
 *   trackingStatus new/confirmed → "New", packed → "Packing", shipped →
 *                  "Sent", delivered → "Delivered", cancelled → "Cancelled"
 *
 * The `unknown` tracking status is not offered — it was never a thing an owner
 * would deliberately choose.
 */

type Lead = {
  id: string;
  name: string;
  phone: string;
  interest: string;
  crmStage: string;
};

type Order = {
  id: string;
  name: string;
  phone: string;
  product: string;
  qty: string;
  trackingStatus: string;
  invoiceNumber?: string;
};

type Complaint = {
  id: string;
  text: string;
  status: string;
};

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  interested: "Interested",
  negotiating: "Buying",
  won: "Bought",
  lost: "Not interested",
};

const STAGE_TONE: Record<string, string> = {
  new: "rp-badge--info",
  interested: "rp-badge--primary",
  negotiating: "rp-badge--warning",
  won: "rp-badge--success",
  lost: "rp-badge",
};

const ORDER_LABEL: Record<string, string> = {
  new: "New",
  confirmed: "New",
  packed: "Packing",
  shipped: "Sent",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Statuses an owner can pick, in the order work actually happens. */
const ORDER_CHOICES = [
  { value: "new", label: "New" },
  { value: "packed", label: "Packing" },
  { value: "shipped", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function CustomersInner() {
  const toast = useToast();
  const search = useSearchParams();
  const [tab, setTab] = useState<"people" | "orders">(
    search.get("tab") === "orders" ? "orders" : "people",
  );
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // See the note in assistant/products — the fetch lives in the effect so a
  // response that lands after unmount is dropped rather than setting state.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [leadsRes, ordersRes, complaintsRes] = await Promise.all([
        apiFetch<{ leads?: Lead[] }>("/api/dashboard/leads"),
        apiFetch<{ orders?: Order[] }>("/api/dashboard/orders"),
        apiFetch<{ complaints?: Complaint[] }>("/api/dashboard/complaints"),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (leadsRes.ok) setLeads(leadsRes.data.leads || []);
      if (ordersRes.ok) setOrders(ordersRes.data.orders || []);
      if (complaintsRes.ok) setComplaints(complaintsRes.data.complaints || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function setStage(id: string, crmStage: string) {
    const result = await apiFetch("/api/dashboard/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, crmStage }),
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Updated");
    reload();
  }

  async function setOrderStatus(id: string, trackingStatus: string) {
    const result = await apiFetch("/api/dashboard/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, trackingStatus }),
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Order updated");
    reload();
  }

  async function resolveComplaint(id: string) {
    const result = await apiFetch("/api/dashboard/complaints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "update", status: "resolved" }),
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Marked as fixed");
    reload();
  }

  const openComplaints = complaints.filter(
    (c) => c.status !== "resolved" && c.status !== "closed",
  );

  return (
    <div className="rp-stack rp-stack--lg">
      <h1 className="rp-page-title">Customers</h1>

      <div className="rp-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "people"}
          className="rp-tab"
          onClick={() => setTab("people")}
        >
          People{leads.length > 0 ? ` (${leads.length})` : ""}
        </button>
        <button
          role="tab"
          aria-selected={tab === "orders"}
          className="rp-tab"
          onClick={() => setTab("orders")}
        >
          Orders{orders.length > 0 ? ` (${orders.length})` : ""}
        </button>
      </div>

      {/* Home routes "unhappy customers" here, so the problem has to be
          resolvable on this screen — otherwise that card is a dead end. */}
      {openComplaints.length > 0 ? (
        <section className="rp-stack">
          <div className="rp-banner rp-banner--warning">
            <span className="rp-banner__icon" aria-hidden="true">
              ⚠️
            </span>
            <span>
              {openComplaints.length}{" "}
              {openComplaints.length === 1 ? "customer has" : "customers have"}{" "}
              a problem that needs fixing.
            </span>
          </div>
          {openComplaints.map((complaint) => (
            <div key={complaint.id} className="rp-card rp-stack">
              <p>{complaint.text}</p>
              <button
                type="button"
                className="rp-btn rp-btn--secondary rp-btn--block"
                onClick={() => void resolveComplaint(complaint.id)}
              >
                Mark as fixed
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {loading ? (
        <div className="rp-stack" aria-busy="true">
          <div className="rp-skeleton rp-skeleton--row" />
          <div className="rp-skeleton rp-skeleton--row" />
        </div>
      ) : tab === "people" ? (
        leads.length === 0 ? (
          <div className="rp-empty">
            <span className="rp-empty__icon" aria-hidden="true">
              👥
            </span>
            <span className="rp-empty__title">No customers yet</span>
            <span className="rp-empty__body">
              When someone chats with your AI and shares their phone number,
              they appear here.
            </span>
          </div>
        ) : (
          <div className="rp-list">
            {leads.map((lead) => (
              <div key={lead.id} className="rp-card rp-stack">
                <div className="rp-row">
                  <span className="rp-avatar">
                    {(lead.name || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="rp-list-row__text">
                    <span className="rp-list-row__title">
                      {lead.name || "Customer"}
                    </span>
                    <span className="rp-list-row__sub">{lead.phone}</span>
                  </span>
                  <span
                    className={`rp-badge ${STAGE_TONE[lead.crmStage] || ""}`}
                  >
                    {STAGE_LABEL[lead.crmStage] || lead.crmStage}
                  </span>
                </div>
                {lead.interest ? (
                  <p style={{ color: "var(--rp-muted)" }}>
                    Interested in: {lead.interest}
                  </p>
                ) : null}
                <div className="rp-field">
                  <label className="rp-label" htmlFor={`stage-${lead.id}`}>
                    Where are they now?
                  </label>
                  <select
                    id={`stage-${lead.id}`}
                    className="rp-input"
                    value={lead.crmStage}
                    onChange={(e) => void setStage(lead.id, e.target.value)}
                  >
                    {Object.entries(STAGE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )
      ) : orders.length === 0 ? (
        <div className="rp-empty">
          <span className="rp-empty__icon" aria-hidden="true">
            📦
          </span>
          <span className="rp-empty__title">No orders yet</span>
          <span className="rp-empty__body">
            When a customer confirms an order in chat, it appears here so you
            know what to pack.
          </span>
        </div>
      ) : (
        <div className="rp-list">
          {orders.map((order) => (
            <div key={order.id} className="rp-card rp-stack">
              <div className="rp-row">
                <span className="rp-list-row__text">
                  <span className="rp-list-row__title">
                    {order.name || "Customer"}
                  </span>
                  <span className="rp-list-row__sub">{order.phone}</span>
                </span>
                <span className="rp-badge rp-badge--primary">
                  {ORDER_LABEL[order.trackingStatus] || "New"}
                </span>
              </div>
              <p>
                {order.product} × {order.qty}
              </p>
              <div className="rp-field">
                <label className="rp-label" htmlFor={`order-${order.id}`}>
                  What&rsquo;s happening with this order?
                </label>
                <select
                  id={`order-${order.id}`}
                  className="rp-input"
                  value={
                    order.trackingStatus === "confirmed"
                      ? "new"
                      : order.trackingStatus
                  }
                  onChange={(e) =>
                    void setOrderStatus(order.id, e.target.value)
                  }
                >
                  {ORDER_CHOICES.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </div>
              <a
                className="rp-btn rp-btn--secondary rp-btn--block"
                href={`/api/dashboard/orders/${order.id}/invoice`}
                target="_blank"
                rel="noreferrer"
              >
                Print receipt
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="rp-stack" aria-busy="true">
          <div className="rp-skeleton rp-skeleton--row" />
        </div>
      }
    >
      <CustomersInner />
    </Suspense>
  );
}
