"use client";

import { useCallback, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  upsellOf?: string[];
  crossSellOf?: string[];
  bundleWith?: string[];
};

type Rec = {
  kind: string;
  score: number;
  reason: string;
  product: Product;
};

export default function RecommendationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState("");
  const [recs, setRecs] = useState<Rec[]>([]);
  const [status, setStatus] = useState("");

  const load = useCallback(async (productId?: string) => {
    const q = productId
      ? `?productId=${encodeURIComponent(productId)}`
      : "";
    const res = await fetch(`/api/dashboard/recommendations${q}`);
    const data = await res.json();
    if (res.ok) {
      setProducts(data.products || []);
      setRecs(data.recommendations || []);
      if (!selected && data.products?.[0]) {
        setSelected(data.products[0].id);
      }
    }
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) void load(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  async function saveRelations(
    id: string,
    field: "upsellOf" | "crossSellOf" | "bundleWith",
    value: string,
  ) {
    const ids = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setStatus("Saving…");
    await fetch("/api/dashboard/recommendations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: ids }),
    });
    setStatus("Saved");
    await load(selected);
  }

  const current = products.find((p) => p.id === selected);

  return (
    <div>
      <h1 className="dash__title">Recommendation Engine</h1>
      <p className="dash__lead">
        Related, upsell, cross-sell, bundle, and personalized scoring from the
        catalog. Bot uses these hints in Messenger / webchat replies.
      </p>

      <div className="dash-panel">
        <label className="field">
          <span>Base product</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (৳{p.price})
              </option>
            ))}
          </select>
        </label>
      </div>

      {current ? (
        <div className="dash-panel dash-form-grid">
          <h2>Relation settings for {current.name}</h2>
          <p className="dash__muted">
            Enter product IDs comma-separated (see Catalog). Example: prod_demo_2
          </p>
          {(
            [
              ["upsellOf", "Upsell of (this is upsell for…)"],
              ["crossSellOf", "Cross-sell of"],
              ["bundleWith", "Bundle with"],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className="field">
              <span>{label}</span>
              <input
                defaultValue={(current[field] || []).join(", ")}
                key={`${current.id}-${field}-${(current[field] || []).join(",")}`}
                onBlur={(e) => saveRelations(current.id, field, e.target.value)}
              />
            </label>
          ))}
          {status ? <p className="dash__muted">{status}</p> : null}
        </div>
      ) : null}

      <div className="dash-panel">
        <h2>Scored recommendations</h2>
        <ul className="dash-list">
          {recs.map((r) => (
            <li key={`${r.kind}-${r.product.id}`}>
              <strong>
                [{r.kind}] {r.product.name}
              </strong>
              <span>
                ৳{r.product.price} · score {r.score.toFixed(1)} · {r.reason}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
