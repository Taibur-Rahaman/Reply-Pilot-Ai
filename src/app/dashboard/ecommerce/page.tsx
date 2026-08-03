"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Conn = {
  id: string;
  platform: string;
  storeUrl: string;
  apiKey?: string;
  status: string;
  lastSyncAt?: string;
  note?: string;
};

export default function EcommercePage() {
  const [connections, setConnections] = useState<Conn[]>([]);
  const [importRaw, setImportRaw] = useState(
    `name,price,stock,color,size,category,sku
Demo Polo,750,20,White,L,apparel,POLO-WHT
Demo Belt,550,12,Black,One,accessories,BELT-BLK`,
  );
  const [status, setStatus] = useState("");
  const [edits, setEdits] = useState<Record<string, { storeUrl: string; apiKey: string }>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/ecommerce");
    const data = await res.json();
    if (res.ok) {
      setConnections(data.connections || []);
      const map: Record<string, { storeUrl: string; apiKey: string }> = {};
      for (const c of data.connections || []) {
        map[c.platform] = {
          storeUrl: c.storeUrl || "",
          apiKey: c.apiKey || "",
        };
      }
      setEdits(map);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(platform: string) {
    const e = edits[platform] || { storeUrl: "", apiKey: "" };
    setStatus(`Saving ${platform}…`);
    await fetch("/api/dashboard/ecommerce", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        storeUrl: e.storeUrl,
        apiKey: e.apiKey,
      }),
    });
    setStatus("Saved");
    await load();
  }

  async function sync(platform: string) {
    setStatus(`Syncing ${platform}…`);
    const res = await fetch("/api/dashboard/ecommerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync", platform }),
    });
    const data = await res.json();
    setStatus(
      res.ok
        ? `Synced ${data.upserted} products (stub/demo). ${data.note || ""}`
        : data.error || "Fail",
    );
    await load();
  }

  async function importProducts(event: FormEvent) {
    event.preventDefault();
    setStatus("Importing…");
    const res = await fetch("/api/dashboard/ecommerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import", raw: importRaw }),
    });
    const data = await res.json();
    setStatus(
      res.ok ? `Imported ${data.upserted} products` : data.error || "Fail",
    );
  }

  return (
    <div>
      <h1 className="dash__title">Ecommerce Connectors</h1>
      <p className="dash__lead">
        One-click cards for WooCommerce, Shopify, WordPress, OpenCart. Save store
        URL + API key; <strong>Sync now</strong> upserts demo catalog (live API
        sync is next-step when keys are validated). Offline CSV/JSON import works
        today.
      </p>

      <div className="dash-roadmap">
        {connections.map((c) => {
          const e = edits[c.platform] || { storeUrl: "", apiKey: "" };
          return (
            <article key={c.id} className="dash-panel">
              <p className="eyebrow">{c.platform}</p>
              <h2 style={{ textTransform: "capitalize" }}>{c.platform}</h2>
              <p className="dash-tag">{c.status}</p>
              <label className="field">
                <span>Store URL</span>
                <input
                  value={e.storeUrl}
                  onChange={(ev) =>
                    setEdits({
                      ...edits,
                      [c.platform]: { ...e, storeUrl: ev.target.value },
                    })
                  }
                  placeholder="https://mystore.com"
                />
              </label>
              <label className="field">
                <span>API key / token</span>
                <input
                  type="password"
                  value={e.apiKey}
                  onChange={(ev) =>
                    setEdits({
                      ...edits,
                      [c.platform]: { ...e, apiKey: ev.target.value },
                    })
                  }
                  placeholder="ck_… / shpat_… / …"
                />
              </label>
              <div className="dash-row">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => save(c.platform)}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => sync(c.platform)}
                >
                  Sync now
                </button>
              </div>
              {c.lastSyncAt ? (
                <p className="dash__muted">
                  Last sync: {new Date(c.lastSyncAt).toLocaleString()}
                </p>
              ) : null}
              {c.note ? <p className="dash__muted">{c.note}</p> : null}
            </article>
          );
        })}
      </div>

      <form className="dash-panel dash-form-grid" onSubmit={importProducts}>
        <h2>Manual CSV / JSON import</h2>
        <p className="dash__muted">
          Works offline for demos. CSV columns: name,price,stock,color,size,category,sku
          — or paste a JSON array of products.
        </p>
        <label className="field">
          <span>Payload</span>
          <textarea
            rows={8}
            value={importRaw}
            onChange={(e) => setImportRaw(e.target.value)}
          />
        </label>
        <button className="btn btn--primary" type="submit">
          Import into catalog
        </button>
      </form>
      {status ? <p className="dash__muted">{status}</p> : null}
    </div>
  );
}
