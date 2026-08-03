"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Faq = { id: string; question: string; answer: string };
type Kb = {
  id: string;
  filename: string;
  source: string;
  status: string;
  note?: string;
  createdAt: string;
};
type Config = {
  businessName: string;
  greeting: string;
  systemPrompt: string;
  productFaq: string;
  productImageUrl: string;
  handoffEnabled: boolean;
  abandonedLeadHours: number;
  personality?: string;
  guardrailRules?: {
    neverInventStock: boolean;
    collectPhone: boolean;
    confirmOrder: boolean;
    escalateRefund: boolean;
    escalateLegal: boolean;
    escalateAngry: boolean;
    escalateLowConfidence: boolean;
    confidenceThreshold: number;
  };
};

export default function KnowledgePage() {
  const [faq, setFaq] = useState<Faq[]>([]);
  const [kb, setKb] = useState<Kb[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [status, setStatus] = useState("");
  const [connectUrl, setConnectUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/knowledge");
    const data = await res.json();
    if (res.ok) {
      setFaq(data.faq || []);
      setKb(data.kb || []);
      setConfig(data.config);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    if (!config) return;
    setStatus("Saving…");
    await fetch("/api/dashboard/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_config", ...config }),
    });
    setStatus("Saved");
    await load();
  }

  async function addFaq(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/dashboard/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert_faq", question: q, answer: a }),
    });
    setQ("");
    setA("");
    await load();
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    setStatus("Uploading…");
    const res = await fetch("/api/dashboard/knowledge", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setStatus(res.ok ? `Uploaded: ${data.kb?.status}` : data.error || "Fail");
    form.reset();
    await load();
  }

  async function stub(
    action:
      | "stub_crawl"
      | "stub_facebook_faq"
      | "stub_google_drive"
      | "stub_google_sheets"
      | "stub_notion",
  ) {
    await fetch("/api/dashboard/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        url: connectUrl || "https://example.com",
      }),
    });
    setStatus(`Recorded ${action}`);
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">AI Knowledge Hub</h1>
      <p className="dash__lead">
        Train from PDF, Excel, CSV, TXT, DOCX (stub extract). Connect stubs for
        Website, Facebook FAQ, Google Drive, Sheets, Notion — unique vs LazyChat.
        Bangla-first system prompt ships in bot config defaults.
      </p>

      {config ? (
        <form className="dash-panel dash-form-grid" onSubmit={saveConfig}>
          <h2>Bot config</h2>
          <label className="field">
            <span>Business name</span>
            <input
              value={config.businessName}
              onChange={(e) =>
                setConfig({ ...config, businessName: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Greeting</span>
            <textarea
              rows={2}
              value={config.greeting}
              onChange={(e) =>
                setConfig({ ...config, greeting: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Personality (Prompt Builder)</span>
            <textarea
              rows={2}
              value={config.personality || ""}
              onChange={(e) =>
                setConfig({ ...config, personality: e.target.value })
              }
              placeholder="Warm Bangla-first sales moderator…"
            />
          </label>
          <fieldset className="field">
            <legend>Hard guardrails</legend>
            {(
              [
                ["neverInventStock", "Never invent stock / prices"],
                ["collectPhone", "Collect phone on order"],
                ["confirmOrder", "Confirm order details"],
                ["escalateRefund", "Escalate refund requests"],
                ["escalateLegal", "Escalate legal / police"],
                ["escalateAngry", "Escalate angry customers"],
                ["escalateLowConfidence", "Escalate when confidence < threshold"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="field field--check">
                <input
                  type="checkbox"
                  checked={config.guardrailRules?.[key] !== false}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      guardrailRules: {
                        neverInventStock: true,
                        collectPhone: true,
                        confirmOrder: true,
                        escalateRefund: true,
                        escalateLegal: true,
                        escalateAngry: true,
                        escalateLowConfidence: true,
                        confidenceThreshold: 0.7,
                        ...config.guardrailRules,
                        [key]: e.target.checked,
                      },
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
            <label className="field">
              <span>Confidence threshold (0–1)</span>
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                value={config.guardrailRules?.confidenceThreshold ?? 0.7}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    guardrailRules: {
                      neverInventStock: true,
                      collectPhone: true,
                      confirmOrder: true,
                      escalateRefund: true,
                      escalateLegal: true,
                      escalateAngry: true,
                      escalateLowConfidence: true,
                      ...config.guardrailRules,
                      confidenceThreshold: Number(e.target.value) || 0.7,
                    },
                  })
                }
              />
            </label>
          </fieldset>
          <label className="field">
            <span>System prompt (Bangla-first)</span>
            <textarea
              rows={6}
              value={config.systemPrompt}
              onChange={(e) =>
                setConfig({ ...config, systemPrompt: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Product FAQ text</span>
            <textarea
              rows={5}
              value={config.productFaq}
              onChange={(e) =>
                setConfig({ ...config, productFaq: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Default product image URL</span>
            <input
              value={config.productImageUrl}
              onChange={(e) =>
                setConfig({ ...config, productImageUrl: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Abandoned lead hours</span>
            <input
              type="number"
              value={config.abandonedLeadHours}
              onChange={(e) =>
                setConfig({
                  ...config,
                  abandonedLeadHours: Number(e.target.value) || 24,
                })
              }
            />
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={config.handoffEnabled}
              onChange={(e) =>
                setConfig({ ...config, handoffEnabled: e.target.checked })
              }
            />
            <span>Human handoff on operator echo</span>
          </label>
          <button className="btn btn--primary" type="submit">
            Save config
          </button>
          {status ? <p className="dash__muted">{status}</p> : null}
        </form>
      ) : null}

      <section className="dash-panel">
        <h2>FAQ items</h2>
        <form className="dash-form-grid" onSubmit={addFaq}>
          <label className="field">
            <span>Question</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} required />
          </label>
          <label className="field">
            <span>Answer</span>
            <textarea
              rows={2}
              value={a}
              onChange={(e) => setA(e.target.value)}
              required
            />
          </label>
          <button className="btn btn--secondary" type="submit">
            Add FAQ
          </button>
        </form>
        <ul className="dash-list">
          {faq.map((f) => (
            <li key={f.id}>
              <strong>{f.question}</strong>
              <p>{f.answer}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="dash-panel">
        <h2>Upload knowledge</h2>
        <p className="dash__muted">
          PDF / Excel / CSV / TXT extract best-effort. DOCX accepted as stub
          (binary extract next-step).
        </p>
        <form onSubmit={onUpload}>
          <input name="file" type="file" required />
          <button className="btn btn--primary" type="submit">
            Upload &amp; extract
          </button>
        </form>
      </section>

      <section className="dash-panel">
        <h2>Connect sources (stubs)</h2>
        <label className="field">
          <span>URL / resource id (optional)</span>
          <input
            value={connectUrl}
            onChange={(e) => setConnectUrl(e.target.value)}
            placeholder="https://… or Drive/Sheet/Notion URL"
          />
        </label>
        <div className="dash-row" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => stub("stub_crawl")}
          >
            Website crawl
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => stub("stub_facebook_faq")}
          >
            Facebook FAQ
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => stub("stub_google_drive")}
          >
            Google Drive
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => stub("stub_google_sheets")}
          >
            Google Sheets
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => stub("stub_notion")}
          >
            Notion
          </button>
        </div>
        <ul className="dash-list">
          {kb.map((d) => (
            <li key={d.id}>
              <strong>{d.filename}</strong> · {d.source} · <em>{d.status}</em>
              {d.note ? <p className="dash__muted">{d.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
