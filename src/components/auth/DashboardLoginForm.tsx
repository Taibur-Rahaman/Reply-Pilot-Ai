"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_PATH, SITE_NAME } from "@/lib/config";

export function DashboardLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@demo.facetai.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    router.replace(DASHBOARD_PATH);
  }

  return (
    <main className="dash-login">
      <div className="dash-login__card">
        <p className="brand-mark brand-mark--sm">{SITE_NAME}</p>
        <h1>Sign in</h1>
        <p className="dash__muted">
          Access your Messenger AI dashboard. Demo:{" "}
          <code>admin@demo.facetai.local</code> — password is{" "}
          <code>ADMIN_PASSWORD</code> or <code>facetai-demo</code>.
        </p>
        <form onSubmit={onSubmit} className="dash-login__form">
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="ADMIN_PASSWORD / facetai-demo"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
