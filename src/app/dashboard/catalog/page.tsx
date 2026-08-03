"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  active: boolean;
};

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [imageUrl, setImageUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/products");
    const data = await res.json();
    if (res.ok) setProducts(data.products || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/dashboard/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        price: Number(price),
        stock: Number(stock),
        imageUrl,
      }),
    });
    setName("");
    setPrice("0");
    setStock("0");
    setImageUrl("");
    await load();
  }

  async function save(product: Product) {
    await fetch("/api/dashboard/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/dashboard/products?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">Product Catalog</h1>
      <p className="dash__lead">
        F40 — name, price, image URL, stock. Powers AI product recommendations.
      </p>

      <form className="dash-panel dash-form-grid" onSubmit={onCreate}>
        <h2>Add product</h2>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Price (৳)</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Stock</span>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Image URL</span>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </label>
        <button className="btn btn--primary" type="submit">
          Add to catalog
        </button>
      </form>

      <div className="dash-table-wrap dash-panel">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Image</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <input
                    value={p.name}
                    onChange={(e) =>
                      setProducts((prev) =>
                        prev.map((x) =>
                          x.id === p.id ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                    onBlur={() => save(p)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={p.price}
                    onChange={(e) =>
                      setProducts((prev) =>
                        prev.map((x) =>
                          x.id === p.id
                            ? { ...x, price: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                    onBlur={() => {
                      const current = products.find((x) => x.id === p.id);
                      if (current) void save(current);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={p.stock}
                    onChange={(e) =>
                      setProducts((prev) =>
                        prev.map((x) =>
                          x.id === p.id
                            ? { ...x, stock: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                    onBlur={() => {
                      const current = products.find((x) => x.id === p.id);
                      if (current) void save(current);
                    }}
                  />
                </td>
                <td>
                  <input
                    value={p.imageUrl}
                    onChange={(e) =>
                      setProducts((prev) =>
                        prev.map((x) =>
                          x.id === p.id
                            ? { ...x, imageUrl: e.target.value }
                            : x,
                        ),
                      )
                    }
                    onBlur={() => {
                      const current = products.find((x) => x.id === p.id);
                      if (current) void save(current);
                    }}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => remove(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
