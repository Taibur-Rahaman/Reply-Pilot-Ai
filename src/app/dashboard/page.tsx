"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  analytics: {
    leads: number;
    orders: number;
    conversations: number;
    messages: number;
    products: number;
    conversionRate: number;
    todayConversations: number;
    todayOrders: number;
    todayRevenue: number;
    openLeads: number;
    aiCostEstimate: number;
  };
  messenger: {
    verifyToken: boolean;
    pageToken: boolean;
    appSecret: boolean;
    aiKey: boolean;
    aiProvider?: string;
    aiModel?: string;
  };
  connect: { appId: boolean; appSecret: boolean; redirectUri: boolean };
  config: { businessName: string };
  session: { tenantId: string; role: string };
};

export default function DashboardHomePage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/dashboard/summary");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load");
        return;
      }
      setData(json);
    })();
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <p className="dash__muted">Loading overview…</p>;

  const a = data.analytics;
  const cards = [
    {
      label: "Today chats",
      value: a.todayConversations ?? a.conversations,
      href: "/dashboard/chats",
    },
    {
      label: "Today orders",
      value: a.todayOrders ?? 0,
      href: "/dashboard/orders",
    },
    {
      label: "Today revenue ৳",
      value: Math.round(a.todayRevenue ?? 0),
      href: "/dashboard/orders",
    },
    {
      label: "Conversion %",
      value: a.conversionRate,
      href: "/dashboard/analytics",
    },
    {
      label: "Open leads",
      value: a.openLeads ?? a.leads,
      href: "/dashboard/leads",
    },
    {
      label: "AI cost (est.)",
      value: a.aiCostEstimate ?? 0,
      href: "/dashboard/analytics",
    },
  ];

  return (
    <div>
      <h1 className="dash__title">{data.config.businessName}</h1>
      <p className="dash__lead">
        Tenant <code>{data.session.tenantId}</code> · Role{" "}
        <code>{data.session.role}</code> — Sales Agent home KPIs (Postgres).
      </p>

      <div className="dash-stats">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="dash-stat">
            <span>{c.label}</span>
            <strong>{c.value}</strong>
          </Link>
        ))}
      </div>

      <section className="dash-panel">
        <h2>Messenger / Connect status</h2>
        <ul className="dash-checklist">
          <li data-ok={data.messenger.verifyToken}>META_VERIFY_TOKEN</li>
          <li data-ok={data.messenger.pageToken}>META_PAGE_ACCESS_TOKEN (env)</li>
          <li data-ok={data.messenger.appSecret}>META_APP_SECRET</li>
          <li data-ok={data.messenger.aiKey}>
            AI LLM ({data.messenger.aiProvider || "—"}
            {data.messenger.aiModel ? ` · ${data.messenger.aiModel}` : ""})
          </li>
          <li data-ok={data.connect.appId}>META_APP_ID (Connect)</li>
          <li data-ok={data.connect.redirectUri}>META_REDIRECT_URI</li>
        </ul>
        <p className="dash__muted">
          Env tokens power the demo Page today. Self-serve{" "}
          <Link href="/dashboard/connect">FaceTai Connect (F39)</Link> needs Meta
          App credentials — demo mode available without them.
        </p>
      </section>
    </div>
  );
}
