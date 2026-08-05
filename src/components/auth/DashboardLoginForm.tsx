"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_NAME, whatsappLink } from "@/lib/config";
import { apiFetch, type FriendlyError } from "@/lib/friendly-errors";

/**
 * Sign in.
 *
 * The previous version pre-filled the admin email and printed the demo password
 * (`facetai-demo`) into the help text and the password placeholder whenever
 * NODE_ENV was not exactly "production" — so any staging or preview deployment
 * served working credentials on its public login page. Both are removed; there
 * is no environment in which this form reveals a credential.
 */
export function DashboardLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace("/app");
  }

  return (
    <main className="rp-page" style={{ maxWidth: 420, paddingTop: "10vh" }}>
      <div className="rp-stack rp-stack--lg">
        <div style={{ textAlign: "center" }}>
          <p className="rp-section-title">{SITE_NAME}</p>
          <h1 style={{ fontSize: "var(--rp-text-2xl)" }}>Welcome back</h1>
        </div>

        <form className="rp-card rp-stack rp-stack--lg" onSubmit={onSubmit}>
          <div className="rp-field">
            <label className="rp-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="rp-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="rp-field">
            <label className="rp-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="rp-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="rp-banner rp-banner--danger" role="alert">
              <span className="rp-banner__icon" aria-hidden="true">
                ❗
              </span>
              <span>{error.message}</span>
            </div>
          ) : null}

          <button
            type="submit"
            className="rp-btn rp-btn--primary rp-btn--block"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="rp-hint" style={{ textAlign: "center" }}>
          Can&rsquo;t sign in?{" "}
          <a href={whatsappLink("signIn")} target="_blank" rel="noreferrer">
            Message us on WhatsApp
          </a>
        </p>
      </div>
    </main>
  );
}
