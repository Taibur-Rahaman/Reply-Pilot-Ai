"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/friendly-errors";
import { useToast } from "@/components/ui/Toast";

/**
 * My business info.
 *
 * The plain-language half of the old Knowledge screen. The system prompt,
 * personality field, guardrail checkboxes, confidence threshold, and
 * "abandoned lead hours" that used to sit alongside these fields have moved to
 * Settings → Advanced.
 *
 * Saving is explicit — the old screens saved silently on blur, which left the
 * user with no idea whether their change had taken.
 */

type Config = {
  businessName: string;
  greeting: string;
  productFaq: string;
};

export default function BusinessInfoPage() {
  const toast = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await apiFetch<{ config?: Config }>(
        "/api/dashboard/knowledge",
      );
      if (result.ok && result.data.config) {
        setConfig({
          businessName: result.data.config.businessName || "",
          greeting: result.data.config.greeting || "",
          productFaq: result.data.config.productFaq || "",
        });
      }
    })();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    const result = await apiFetch("/api/dashboard/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_config", ...config }),
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Saved");
  }

  if (!config) {
    return (
      <div className="rp-stack" aria-busy="true">
        <div className="rp-skeleton rp-skeleton--row" />
        <div className="rp-skeleton rp-skeleton--row" />
      </div>
    );
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

      <h1 className="rp-page-title">My business info</h1>
      <p style={{ color: "var(--rp-muted)" }}>
        Your AI uses this to answer customers.
      </p>

      <form className="rp-card rp-stack rp-stack--lg" onSubmit={save}>
        <div className="rp-field">
          <label className="rp-label" htmlFor="biz-name">
            What is your business name?
          </label>
          <input
            id="biz-name"
            className="rp-input"
            value={config.businessName}
            onChange={(e) =>
              setConfig({ ...config, businessName: e.target.value })
            }
          />
          <span className="rp-hint">Customers will see this name.</span>
        </div>

        <div className="rp-field">
          <label className="rp-label" htmlFor="biz-greeting">
            What should your AI say first?
          </label>
          <textarea
            id="biz-greeting"
            className="rp-input"
            value={config.greeting}
            onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
          />
          <span className="rp-hint">
            This is the first thing a new customer reads.
          </span>
        </div>

        <div className="rp-field">
          <label className="rp-label" htmlFor="biz-about">
            What should customers know?
          </label>
          <textarea
            id="biz-about"
            className="rp-input"
            value={config.productFaq}
            onChange={(e) =>
              setConfig({ ...config, productFaq: e.target.value })
            }
            placeholder="Opening hours, delivery areas, prices, return rules…"
          />
        </div>

        <button
          type="submit"
          className="rp-btn rp-btn--primary rp-btn--block"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
