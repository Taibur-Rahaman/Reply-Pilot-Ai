"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type PageConn = {
  id: string;
  pageId: string;
  pageName: string;
  status: string;
  mode: string;
  permissionsOk: boolean;
  webhookSubscribed: boolean;
  lastError?: string;
  connectedAt: string;
};

function ConnectInner() {
  const search = useSearchParams();
  const [pages, setPages] = useState<PageConn[]>([]);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [mode, setMode] = useState("demo_only");
  const [docs, setDocs] = useState<{ steps: string[]; note: string } | null>(
    null,
  );
  const [pageName, setPageName] = useState("My Demo Page");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/connect");
    const data = await res.json();
    if (res.ok) {
      setPages(data.pages || []);
      setLoginUrl(data.loginUrl);
      setMode(data.mode);
      setDocs(data.docs);
    }
  }, []);

  useEffect(() => {
    void load();
    const err = search.get("error");
    const connected = search.get("connected");
    if (err) setMessage(`Error: ${err}`);
    if (connected) setMessage(`Connected (pending activate): ${connected}`);
  }, [load, search]);

  async function demoConnect(event: FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "demo_connect", pageName }),
    });
    const data = await res.json();
    setMessage(data.note || "Demo connected");
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">FaceTai Connect</h1>
      <p className="dash__lead">
        F39 — Login with Facebook → Select Page → Connect. Auto webhook +
        permissions when Meta credentials are set. Not marketed as live without
        App Review.
      </p>

      {message ? <p className="dash-banner">{message}</p> : null}

      <section className="dash-panel">
        <h2>Mode: {mode === "oauth_ready" ? "OAuth ready" : "Demo only"}</h2>
        {loginUrl ? (
          <a className="btn btn--primary" href={loginUrl}>
            Login with Facebook
          </a>
        ) : (
          <p className="dash__muted">
            Set <code>META_APP_ID</code> + <code>META_REDIRECT_URI</code> to
            enable the Facebook Login button.
          </p>
        )}

        <form className="dash-form-grid" onSubmit={demoConnect}>
          <h3>Demo Connect (local UX)</h3>
          <label className="field">
            <span>Mock page name</span>
            <input
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
            />
          </label>
          <button className="btn btn--secondary" type="submit">
            Connect demo page
          </button>
        </form>
      </section>

      <section className="dash-panel">
        <h2>Connected pages</h2>
        <ul className="dash-list">
          {pages.map((p) => (
            <li key={p.id}>
              <strong>{p.pageName}</strong> · {p.mode} · {p.status}
              <br />
              <small>
                pageId {p.pageId} · webhook{" "}
                {p.webhookSubscribed ? "yes" : "no"} · perms{" "}
                {p.permissionsOk ? "ok" : "pending"}
              </small>
              {p.lastError ? (
                <p className="dash__muted">{p.lastError}</p>
              ) : null}
            </li>
          ))}
          {pages.length === 0 ? (
            <li className="dash__muted">No pages connected yet.</li>
          ) : null}
        </ul>
      </section>

      {docs ? (
        <section className="dash-panel">
          <h2>Real Meta Embedded Signup steps</h2>
          <ol>
            {docs.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="dash__muted">{docs.note}</p>
        </section>
      ) : null}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<p className="dash__muted">Loading Connect…</p>}>
      <ConnectInner />
    </Suspense>
  );
}
