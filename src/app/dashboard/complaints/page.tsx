"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Complaint = {
  id: string;
  text: string;
  priority: string;
  status: string;
  resolution: string;
  channel?: string;
  senderId?: string;
  notes?: string;
  createdAt: string;
};

const STATUSES = [
  "open",
  "escalated",
  "refund_pending",
  "exchange_pending",
  "resolved",
  "closed",
];
const RESOLUTIONS = ["none", "refund", "exchange", "apology"];

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/complaints");
    const data = await res.json();
    if (res.ok) setComplaints(data.complaints || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/dashboard/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, priority: "high" }),
    });
    setText("");
    await load();
  }

  async function escalate(id: string) {
    setStatus("Escalating…");
    await fetch("/api/dashboard/complaints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "escalate" }),
    });
    setStatus("Escalated to human handoff");
    await load();
  }

  async function patch(
    id: string,
    body: Record<string, string>,
  ) {
    await fetch("/api/dashboard/complaints", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "update", ...body }),
    });
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">AI Complaint Center</h1>
      <p className="dash__lead">
        Keyword detection (BN/EN) tags priority in the bot pipeline. Escalate to
        human handoff; track refund / exchange workflow.
      </p>

      <form className="dash-panel dash-form-grid" onSubmit={create}>
        <h2>Log complaint</h2>
        <label className="field">
          <span>Text</span>
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="প্রোডাক্ট নষ্ট এসেছে / Wrong size — need exchange"
            required
          />
        </label>
        <button className="btn btn--primary" type="submit">
          Add
        </button>
        {status ? <p className="dash__muted">{status}</p> : null}
      </form>

      <div className="dash-table-wrap dash-panel">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Text</th>
              <th>Status</th>
              <th>Resolution</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id}>
                <td>
                  <em className="dash-tag">{c.priority}</em>
                  {c.channel ? (
                    <>
                      <br />
                      <small>{c.channel}</small>
                    </>
                  ) : null}
                </td>
                <td>
                  {c.text}
                  <br />
                  <small>{new Date(c.createdAt).toLocaleString()}</small>
                </td>
                <td>
                  <select
                    value={c.status}
                    onChange={(e) => patch(c.id, { status: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={c.resolution}
                    onChange={(e) =>
                      patch(c.id, { resolution: e.target.value })
                    }
                  >
                    {RESOLUTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => escalate(c.id)}
                  >
                    Escalate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {complaints.length === 0 ? (
          <p className="dash__muted">No complaints yet.</p>
        ) : null}
      </div>
    </div>
  );
}
