"use client";

import { useCallback, useEffect, useState } from "react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  disabled: boolean;
  createdAt: string;
};

/** Super-admin tenant list scaffold (Phase 1). */
export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/tenants");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Unauthorized");
      return;
    }
    setTenants(data.tenants || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(tenantId: string, disabled: boolean) {
    setStatus("Updating…");
    const res = await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, disabled }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Saved" : data.error || "Fail");
    await load();
  }

  return (
    <main className="admin">
      <div className="admin__inner">
        <p className="brand-mark brand-mark--sm">FaceTai</p>
        <h1 className="admin__title">Super Admin — Tenants</h1>
        <p className="admin__lead">
          Phase 1 scaffold: list tenants and disable/enable. Billing comes later.
          Requires dashboard login as demo admin.{" "}
          <a href="/admin">Bot knowledge (legacy)</a> ·{" "}
          <a href="/dashboard">Dashboard</a>
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="admin__hint">{status}</p> : null}
        <ul className="dash-list">
          {tenants.map((t) => (
            <li key={t.id}>
              <strong>{t.name}</strong> · <code>{t.slug}</code> ·{" "}
              <em>{t.disabled ? "disabled" : "active"}</em>
              <br />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void toggle(t.id, !t.disabled)}
              >
                {t.disabled ? "Enable" : "Disable"}
              </button>
            </li>
          ))}
        </ul>
        {tenants.length === 0 && !error ? (
          <p className="dash__muted">No tenants yet — run npm run seed.</p>
        ) : null}
      </div>
    </main>
  );
}
