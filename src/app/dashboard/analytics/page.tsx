"use client";

import { useEffect, useState } from "react";

type Analytics = {
  leads: number;
  orders: number;
  conversations: number;
  messages: number;
  products: number;
  wonLeads: number;
  conversionRate: number;
  byCrmStage: Record<string, number>;
  byTrackingStatus: Record<string, number>;
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/dashboard/analytics");
      const data = await res.json();
      if (res.ok) {
        setAnalytics(data.analytics);
        setNote(data.note || "");
      }
    })();
  }, []);

  if (!analytics) return <p className="dash__muted">Loading analytics…</p>;

  return (
    <div>
      <h1 className="dash__title">AI Analytics</h1>
      <p className="dash__lead">
        F47 thin slice — counts from tenant DB. Ad performance / revenue deepen
        in Wave B.
      </p>
      {note ? <p className="dash__muted">{note}</p> : null}

      <div className="dash-stats">
        <div className="dash-stat">
          <span>Leads</span>
          <strong>{analytics.leads}</strong>
        </div>
        <div className="dash-stat">
          <span>Orders</span>
          <strong>{analytics.orders}</strong>
        </div>
        <div className="dash-stat">
          <span>Won leads</span>
          <strong>{analytics.wonLeads}</strong>
        </div>
        <div className="dash-stat">
          <span>Conversion %</span>
          <strong>{analytics.conversionRate}</strong>
        </div>
        <div className="dash-stat">
          <span>Messages</span>
          <strong>{analytics.messages}</strong>
        </div>
      </div>

      <div className="dash-split">
        <section className="dash-panel">
          <h2>CRM stages</h2>
          <ul>
            {Object.entries(analytics.byCrmStage).map(([k, v]) => (
              <li key={k}>
                {k}: <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="dash-panel">
          <h2>Order tracking</h2>
          <ul>
            {Object.entries(analytics.byTrackingStatus).map(([k, v]) => (
              <li key={k}>
                {k}: <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
