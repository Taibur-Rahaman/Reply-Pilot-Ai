"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/friendly-errors";
import { useToast } from "@/components/ui/Toast";

/**
 * What I sell.
 *
 * Replaces the Catalog table, which was four inline inputs per row saving
 * silently on blur, plus a separate "Recommendations" screen that asked the
 * owner to type product IDs like `prod_demo_2` into comma-separated fields.
 *
 * Product relations are gone from the UI entirely — the scoring engine already
 * derives them, and no shop owner should be editing foreign keys.
 */

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  active: boolean;
};

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", price: "", stock: "" });

  // Bumping this re-runs the fetch. Keeping the request inside the effect (as
  // opposed to a useCallback invoked from it) means the response can be dropped
  // when the component unmounts mid-flight, which matters on a slow connection
  // where the user may well navigate away before the list arrives.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiFetch<{ products?: Product[] }>(
        "/api/dashboard/products",
      );
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setProducts(result.data.products || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function add(event: FormEvent) {
    event.preventDefault();
    const result = await apiFetch("/api/dashboard/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        imageUrl: "",
      }),
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`${form.name} added`);
    setForm({ name: "", price: "", stock: "" });
    setAdding(false);
    reload();
  }

  async function remove(product: Product) {
    setConfirmDelete(null);
    const result = await apiFetch(
      `/api/dashboard/products?id=${encodeURIComponent(product.id)}`,
      { method: "DELETE" },
    );
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`${product.name} removed`);
    reload();
  }

  return (
    <div className="rp-stack rp-stack--lg">
      <Link
        href="/app/assistant"
        className="rp-btn rp-btn--ghost"
        style={{ alignSelf: "flex-start" }}
      >
        ← AI Assistant
      </Link>

      <h1 className="rp-page-title">What I sell</h1>
      <p style={{ color: "var(--rp-muted)" }}>
        Your AI tells customers about these when they ask.
      </p>

      {adding ? (
        <form className="rp-card rp-stack rp-stack--lg" onSubmit={add}>
          <h2>Add something you sell</h2>
          <div className="rp-field">
            <label className="rp-label" htmlFor="p-name">
              What is it called?
            </label>
            <input
              id="p-name"
              className="rp-input"
              required
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Blue shirt"
            />
          </div>
          <div className="rp-field">
            <label className="rp-label" htmlFor="p-price">
              How much does it cost?
            </label>
            <input
              id="p-price"
              className="rp-input"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="750"
            />
            <span className="rp-hint">In taka (৳)</span>
          </div>
          <div className="rp-field">
            <label className="rp-label" htmlFor="p-stock">
              How many do you have?
            </label>
            <input
              id="p-stock"
              className="rp-input"
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="20"
            />
          </div>
          <button type="submit" className="rp-btn rp-btn--primary rp-btn--block">
            Add it
          </button>
          <button
            type="button"
            className="rp-btn rp-btn--ghost"
            onClick={() => setAdding(false)}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="rp-btn rp-btn--primary rp-btn--block"
          onClick={() => setAdding(true)}
        >
          + Add something you sell
        </button>
      )}

      {loading ? (
        <div className="rp-stack" aria-busy="true">
          <div className="rp-skeleton rp-skeleton--row" />
          <div className="rp-skeleton rp-skeleton--row" />
        </div>
      ) : products.length === 0 ? (
        <div className="rp-empty">
          <span className="rp-empty__icon" aria-hidden="true">
            🏷️
          </span>
          <span className="rp-empty__title">Nothing added yet</span>
          <span className="rp-empty__body">
            Add what you sell so your AI can tell customers the price and
            whether it&rsquo;s in stock.
          </span>
        </div>
      ) : (
        <div className="rp-list">
          {products.map((product) => (
            <div key={product.id} className="rp-list-row">
              <span className="rp-list-row__text">
                <span className="rp-list-row__title">{product.name}</span>
                <span className="rp-list-row__sub">
                  ৳{product.price} ·{" "}
                  {product.stock > 0
                    ? `${product.stock} left`
                    : "Out of stock"}
                </span>
              </span>
              <button
                type="button"
                className="rp-icon-btn"
                aria-label={`Remove ${product.name}`}
                onClick={() => setConfirmDelete(product)}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmDelete ? (
        <div className="rp-scrim" onClick={() => setConfirmDelete(null)}>
          <div
            className="rp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="rp-modal__title" id="del-title">
              Remove {confirmDelete.name}?
            </h3>
            <p style={{ color: "var(--rp-muted)" }}>
              Your AI will stop telling customers about it.
            </p>
            <div className="rp-modal__actions">
              <button
                type="button"
                className="rp-btn rp-btn--ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Keep it
              </button>
              <button
                type="button"
                className="rp-btn rp-btn--danger"
                onClick={() => void remove(confirmDelete)}
              >
                Yes, remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
