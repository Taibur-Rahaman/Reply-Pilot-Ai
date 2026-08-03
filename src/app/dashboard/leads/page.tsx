"use client";

import { useCallback, useEffect, useState } from "react";

type Lead = {
  id: string;
  name: string;
  phone: string;
  businessType: string;
  interest: string;
  crmStage: string;
  followUpQueuedAt?: string;
  followUpSentAt?: string;
  createdAt: string;
};

const STAGES = ["new", "interested", "negotiating", "won", "lost"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [abandoned, setAbandoned] = useState<Lead[]>([]);
  const [hint, setHint] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/leads");
    const data = await res.json();
    if (res.ok) {
      setLeads(data.leads || []);
      setAbandoned(data.abandoned || []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStage(id: string, crmStage: string) {
    await fetch("/api/dashboard/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, crmStage }),
    });
    await load();
  }

  async function followUp(id: string) {
    const res = await fetch("/api/dashboard/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "queue_followup" }),
    });
    const data = await res.json();
    setHint(data.suggestedMessage || data.note || "");
    await load();
  }

  async function markSent(id: string) {
    await fetch("/api/dashboard/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "mark_followup_sent" }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">Leads &amp; CRM</h1>
      <p className="dash__lead">
        Pipeline stages: New → Interested → Negotiating → Won / Lost (F43).
      </p>

      {abandoned.length > 0 ? (
        <section className="dash-panel">
          <h2>Abandoned follow-up ({abandoned.length})</h2>
          <p className="dash__muted">
            Leads past the abandoned window without a follow-up. Queue a nudge
            (Meta send needs Connect + messaging window).
          </p>
          <ul className="dash-list">
            {abandoned.map((l) => (
              <li key={l.id} className="dash-row">
                <div>
                  <strong>{l.name}</strong> · {l.phone}
                </div>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => followUp(l.id)}
                >
                  Queue follow-up
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => markSent(l.id)}
                >
                  Mark sent
                </button>
              </li>
            ))}
          </ul>
          {hint ? <pre className="dash-pre">{hint}</pre> : null}
        </section>
      ) : null}

      <section className="dash-panel">
        <h2>All leads</h2>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Interest</th>
                <th>Stage</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.phone}</td>
                  <td>{l.interest}</td>
                  <td>
                    <select
                      value={l.crmStage}
                      onChange={(e) => setStage(l.id, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 ? (
            <p className="dash__muted">No leads yet — submit the landing form.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
