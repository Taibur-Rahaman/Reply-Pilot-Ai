"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type BusinessConfig = {
  pageId: string;
  businessName: string;
  greeting: string;
  systemPrompt: string;
  productFaq: string;
  productImageUrl: string;
  handoffEnabled: boolean;
  updatedAt: string;
};

type MessengerStatus = {
  verifyToken: boolean;
  pageToken: boolean;
  appSecret: boolean;
  aiKey: boolean;
  aiProvider?: string;
  aiModel?: string;
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [messenger, setMessenger] = useState<MessengerStatus | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [testText, setTestText] = useState("প্রাইস কত?");
  const [testReply, setTestReply] = useState("");

  const load = useCallback(async (pwd: string) => {
    setError("");
    setStatus("Loading…");
    const response = await fetch("/api/admin/config", {
      headers: { "x-admin-password": pwd },
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unauthorized");
      setStatus("");
      setConfig(null);
      return;
    }
    setConfig(data.config);
    setMessenger(data.messenger);
    setStatus("Loaded");
  }, []);

  useEffect(() => {
    // Try empty password for local (no ADMIN_PASSWORD) once.
    void load("");
  }, [load]);

  async function onUnlock(event: FormEvent) {
    event.preventDefault();
    await load(password);
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config) return;
    setStatus("Saving…");
    setError("");
    const response = await fetch("/api/admin/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify(config),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Save failed");
      setStatus("");
      return;
    }
    setConfig(data.config);
    setStatus("Saved");
  }

  async function onTestReply(event: FormEvent) {
    event.preventDefault();
    setTestReply("…");
    const response = await fetch("/api/bot/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: testText }),
    });
    const data = await response.json();
    if (!response.ok) {
      setTestReply(data.error || "Failed");
      return;
    }
    setTestReply(`[${data.source}] ${data.reply}`);
  }

  return (
    <main className="admin">
      <div className="admin__inner">
        <p className="brand-mark brand-mark--sm">FaceTai</p>
        <h1 className="admin__title">Admin lite — bot knowledge</h1>
        <p className="admin__lead">
          Set greeting, system prompt, product FAQ, and product image URL.
          Meta tokens stay in <code>.env.local</code> — never pasted here.
        </p>

        <form className="admin__unlock" onSubmit={onUnlock}>
          <label className="field">
            <span>Admin password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ADMIN_PASSWORD"
              autoComplete="current-password"
            />
          </label>
          <button className="btn btn--secondary" type="submit">
            Unlock / reload
          </button>
        </form>

        {messenger ? (
          <ul className="admin__status">
            <li data-ok={messenger.verifyToken}>META_VERIFY_TOKEN</li>
            <li data-ok={messenger.pageToken}>META_PAGE_ACCESS_TOKEN</li>
            <li data-ok={messenger.appSecret}>META_APP_SECRET</li>
            <li data-ok={messenger.aiKey}>
              AI LLM ({messenger.aiProvider || "—"}
              {messenger.aiModel ? ` · ${messenger.aiModel}` : ""})
            </li>
          </ul>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="admin__hint">{status}</p> : null}

        {config ? (
          <>
            <form className="admin__form" onSubmit={onSave}>
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
                <span>Page ID (optional)</span>
                <input
                  value={config.pageId}
                  onChange={(e) =>
                    setConfig({ ...config, pageId: e.target.value })
                  }
                  placeholder="Facebook Page ID"
                />
              </label>
              <label className="field">
                <span>Greeting</span>
                <textarea
                  rows={3}
                  value={config.greeting}
                  onChange={(e) =>
                    setConfig({ ...config, greeting: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>System prompt</span>
                <textarea
                  rows={6}
                  value={config.systemPrompt}
                  onChange={(e) =>
                    setConfig({ ...config, systemPrompt: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Product FAQ</span>
                <textarea
                  rows={8}
                  value={config.productFaq}
                  onChange={(e) =>
                    setConfig({ ...config, productFaq: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Product image URL</span>
                <input
                  value={config.productImageUrl}
                  onChange={(e) =>
                    setConfig({ ...config, productImageUrl: e.target.value })
                  }
                  placeholder="https://…"
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
                <span>Human handoff when Page operator replies (echo)</span>
              </label>
              <button className="btn btn--primary" type="submit">
                Save knowledge
              </button>
            </form>

            <form className="admin__test" onSubmit={onTestReply}>
              <h2>Test reply (no Messenger send)</h2>
              <label className="field">
                <span>Customer message</span>
                <input
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                />
              </label>
              <button className="btn btn--ghost" type="submit">
                Generate reply
              </button>
              {testReply ? <pre className="admin__pre">{testReply}</pre> : null}
            </form>
          </>
        ) : null}

        <p className="admin__hint">
          Prefer the full ops UI:{" "}
          <a href="/dashboard">/dashboard</a> · Webhook:{" "}
          <code>/api/messenger/webhook</code> · Docs:{" "}
          <code>docs/PHASE2-AI-BOT.md</code>
        </p>
      </div>
    </main>
  );
}
