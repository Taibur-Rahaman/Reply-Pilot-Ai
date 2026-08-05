"use client";

import { FormEvent, useState } from "react";
import { INTEREST_OPTIONS, whatsappLink } from "@/lib/config";

type Status = "idle" | "loading" | "success" | "error";

export function LeadForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // Replaced on success by the personalised link the API builds from the
  // submitted details. This fallback only shows if that field is missing, so it
  // still needs to arrive pre-filled rather than as an empty chat.
  const [whatsappUrl, setWhatsappUrl] = useState(whatsappLink("consultation"));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      businessType: String(form.get("businessType") ?? ""),
      interest: String(form.get("interest") ?? ""),
      source: compact ? "hero-cta" : "final-cta",
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        whatsappUrl?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong.");
        return;
      }

      if (data.whatsappUrl) {
        setWhatsappUrl(data.whatsappUrl);
      }
      setStatus("success");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
      setError("Network error. Please try again or message us on WhatsApp.");
    }
  }

  if (status === "success") {
    return (
      <div className="lead-success" role="status">
        <p className="lead-success__title">Got it — we&apos;ll reach out soon.</p>
        <p className="lead-success__text">
          For the fastest reply, continue on WhatsApp now.
        </p>
        <a className="btn btn--whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
          Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form className={`lead-form ${compact ? "lead-form--compact" : ""}`} onSubmit={onSubmit}>
      <div className="lead-form__grid">
        <label className="field">
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" required placeholder="Your name" />
        </label>
        <label className="field">
          <span>WhatsApp / Phone</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            placeholder="01XXXXXXXXX"
          />
        </label>
        <label className="field">
          <span>Business type</span>
          <input
            name="businessType"
            type="text"
            required
            placeholder="Fashion, clinic, restaurant…"
          />
        </label>
        <label className="field">
          <span>Interested in</span>
          <select name="interest" required defaultValue="">
            <option value="" disabled>
              Select a package
            </option>
            {INTEREST_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="btn btn--primary" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Get a free consultation"}
      </button>
    </form>
  );
}
