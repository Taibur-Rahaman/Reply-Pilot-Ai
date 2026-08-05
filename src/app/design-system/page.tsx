"use client";

import { useState } from "react";

/**
 * Design system preview.
 *
 * Renders every `.rp-*` primitive in every state so the visual language can be
 * reviewed in one place before pages are migrated onto it. Development aid —
 * this route is excluded from the sitemap and linked from nowhere in the app.
 */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "var(--rp-space-8)" }}>
      <h2 className="rp-section-title">{title}</h2>
      <div className="rp-stack rp-stack--lg">{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  const [checked, setChecked] = useState(true);
  const [tab, setTab] = useState("people");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="rp-page">
      <h1 className="rp-page-title">Design System</h1>
      <p className="rp-page-lead">
        Dark Premium · base 16px · 8px spacing · 48px minimum touch target
      </p>

      <Section title="Colour">
        <div className="rp-grid-2">
          {[
            ["--rp-bg", "Background"],
            ["--rp-surface", "Surface"],
            ["--rp-card", "Card"],
            ["--rp-card-hi", "Card raised"],
            ["--rp-primary", "Primary"],
            ["--rp-secondary", "Secondary"],
            ["--rp-accent", "Accent"],
            ["--rp-muted", "Muted text"],
          ].map(([token, label]) => (
            <div key={token} className="rp-card" style={{ padding: 16 }}>
              <div
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: `var(${token})`,
                  border: "1px solid var(--rp-line)",
                  marginBottom: 8,
                }}
              />
              <strong style={{ fontSize: "var(--rp-text-sm)" }}>{label}</strong>
              <div
                style={{
                  fontSize: "var(--rp-text-xs)",
                  color: "var(--rp-muted)",
                }}
              >
                {token}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="rp-card rp-stack">
          <div style={{ fontSize: "var(--rp-text-3xl)", fontWeight: 700 }}>
            40px — Onboarding headline
          </div>
          <div style={{ fontSize: "var(--rp-text-2xl)", fontWeight: 600 }}>
            30px — Page title
          </div>
          <div style={{ fontSize: "var(--rp-text-xl)", fontWeight: 600 }}>
            24px — Section heading
          </div>
          <div style={{ fontSize: "var(--rp-text-lg)", fontWeight: 600 }}>
            20px — Card title
          </div>
          <div style={{ fontSize: "var(--rp-text-base)" }}>
            17px — Body default. This is the smallest size used for anything a
            customer needs to read and act on.
          </div>
          <div
            style={{ fontSize: "var(--rp-text-sm)", color: "var(--rp-muted)" }}
          >
            16px — Secondary text
          </div>
          <div
            style={{ fontSize: "var(--rp-text-xs)", color: "var(--rp-muted)" }}
          >
            14px — Badges and timestamps only. Never body copy.
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="rp-card rp-stack">
          <div className="rp-row">
            <button className="rp-btn rp-btn--primary">Primary</button>
            <button className="rp-btn rp-btn--secondary">Secondary</button>
            <button className="rp-btn rp-btn--ghost">Ghost</button>
            <button className="rp-btn rp-btn--danger">Delete</button>
          </div>
          <div className="rp-row">
            <button className="rp-btn rp-btn--primary" disabled>
              Disabled
            </button>
            <button className="rp-icon-btn" aria-label="More options">
              ⋯
            </button>
          </div>
          <button className="rp-btn rp-btn--primary rp-btn--block">
            Connect My Facebook Page
          </button>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="rp-card rp-stack rp-stack--lg">
          <div className="rp-field">
            <label className="rp-label" htmlFor="ds-name">
              What is your business name?
            </label>
            <input
              id="ds-name"
              className="rp-input"
              placeholder="Rahim Store"
            />
            <span className="rp-hint">Customers will see this name.</span>
          </div>

          <div className="rp-field">
            <label className="rp-label" htmlFor="ds-phone">
              Phone number
            </label>
            <input
              id="ds-phone"
              className="rp-input"
              aria-invalid="true"
              defaultValue="017"
            />
            <span className="rp-field-error">
              <span aria-hidden="true">⚠</span> That phone number looks too
              short.
            </span>
          </div>

          <div className="rp-field">
            <label className="rp-label" htmlFor="ds-select">
              Do you deliver?
            </label>
            <select id="ds-select" className="rp-input">
              <option>Yes, everywhere</option>
              <option>Only nearby</option>
              <option>No delivery</option>
            </select>
          </div>

          <div className="rp-field">
            <label className="rp-label" htmlFor="ds-area">
              Anything customers should know?
            </label>
            <textarea
              id="ds-area"
              className="rp-input"
              placeholder="We are closed on Fridays."
            />
          </div>

          <label className="rp-switch">
            <span>Let my AI reply at night</span>
            <input
              type="checkbox"
              className="rp-sr-only"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className="rp-switch__track" />
          </label>
        </div>
      </Section>

      <Section title="Action cards">
        <button className="rp-action-card">
          <span className="rp-action-card__icon" aria-hidden="true">
            💬
          </span>
          <span className="rp-action-card__text">
            <span className="rp-action-card__title">
              3 customers are waiting
            </span>
            <span className="rp-action-card__sub">
              They asked something new
            </span>
          </span>
          <span className="rp-action-card__chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <button className="rp-action-card">
          <span className="rp-action-card__icon" aria-hidden="true">
            📦
          </span>
          <span className="rp-action-card__text">
            <span className="rp-action-card__title">5 orders to pack</span>
          </span>
          <span className="rp-action-card__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      </Section>

      <Section title="Stats — plain numbers, no charts">
        <div className="rp-grid-2">
          <div className="rp-stat">
            <span className="rp-stat__value">12</span>
            <span className="rp-stat__label">Customers today</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat__value">4</span>
            <span className="rp-stat__label">Orders</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat__value">৳4,200</span>
            <span className="rp-stat__label">Earned</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat__value">9</span>
            <span className="rp-stat__label">AI replied</span>
          </div>
        </div>
      </Section>

      <Section title="List rows">
        <div className="rp-list">
          <button className="rp-list-row">
            <span className="rp-avatar">K</span>
            <span className="rp-list-row__text">
              <span className="rp-list-row__title">Karim Ahmed</span>
              <span className="rp-list-row__sub">
                Do you deliver to Mirpur?
              </span>
            </span>
            <span className="rp-badge rp-badge--warning">Waiting</span>
          </button>
          <button className="rp-list-row rp-list-row--active">
            <span className="rp-avatar">S</span>
            <span className="rp-list-row__text">
              <span className="rp-list-row__title">Sadia Rahman</span>
              <span className="rp-list-row__sub">Thank you!</span>
            </span>
            <span className="rp-badge rp-badge--success">AI replied</span>
          </button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="rp-row">
          <span className="rp-badge">Neutral</span>
          <span className="rp-badge rp-badge--success">✓ Delivered</span>
          <span className="rp-badge rp-badge--warning">● Waiting</span>
          <span className="rp-badge rp-badge--danger">! Problem</span>
          <span className="rp-badge rp-badge--info">New</span>
          <span className="rp-badge rp-badge--primary">Interested</span>
        </div>
      </Section>

      <Section title="Banners">
        <div className="rp-banner rp-banner--success">
          <span className="rp-banner__icon" aria-hidden="true">
            ✅
          </span>
          <span>Your AI is connected and answering customers.</span>
        </div>
        <div className="rp-banner rp-banner--warning">
          <span className="rp-banner__icon" aria-hidden="true">
            ⚠️
          </span>
          <span>
            Your Facebook permission has expired. Tap Reconnect to fix it.
          </span>
        </div>
        <div className="rp-banner rp-banner--danger">
          <span className="rp-banner__icon" aria-hidden="true">
            ❗
          </span>
          <span>
            We couldn&rsquo;t connect your Facebook page. Please try again.
          </span>
        </div>
      </Section>

      <Section title="Tabs">
        <div className="rp-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "people"}
            className="rp-tab"
            onClick={() => setTab("people")}
          >
            People
          </button>
          <button
            role="tab"
            aria-selected={tab === "orders"}
            className="rp-tab"
            onClick={() => setTab("orders")}
          >
            Orders
          </button>
        </div>
      </Section>

      <Section title="Table → cards below 861px">
        <div className="rp-card">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>What they bought</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Customer">Karim Ahmed</td>
                <td data-label="What they bought">Blue Shirt × 2</td>
                <td data-label="Status">
                  <span className="rp-badge rp-badge--success">Delivered</span>
                </td>
              </tr>
              <tr>
                <td data-label="Customer">Sadia Rahman</td>
                <td data-label="What they bought">Leather Belt × 1</td>
                <td data-label="Status">
                  <span className="rp-badge rp-badge--warning">Packing</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Chat bubbles">
        <div className="rp-card">
          <div className="rp-chat">
            <div className="rp-bubble rp-bubble--customer">
              Do you deliver to Mirpur?
              <span className="rp-bubble__meta">Karim · 2 min ago</span>
            </div>
            <div className="rp-bubble rp-bubble--ai">
              Yes! We deliver to Mirpur. Delivery is ৳60 and takes 1 day.
              <span className="rp-bubble__meta">Your AI · 2 min ago</span>
            </div>
            <div className="rp-bubble rp-bubble--me">
              I can send it today if you order now.
              <span className="rp-bubble__meta">You · just now</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Empty state">
        <div className="rp-empty">
          <span className="rp-empty__icon" aria-hidden="true">
            💬
          </span>
          <span className="rp-empty__title">No messages yet</span>
          <span className="rp-empty__body">
            When someone messages your Facebook page, their message will appear
            here and your AI will answer it.
          </span>
          <button className="rp-btn rp-btn--secondary">
            Send myself a test message
          </button>
        </div>
      </Section>

      <Section title="Loading">
        <div className="rp-stack">
          <div className="rp-skeleton rp-skeleton--row" />
          <div className="rp-skeleton rp-skeleton--row" />
        </div>
      </Section>

      <Section title="Progress">
        <div className="rp-stepper">
          <span className="rp-stepper__label">Step 2 of 3</span>
        </div>
        <div className="rp-progress">
          <div className="rp-progress__fill" style={{ width: "66%" }} />
        </div>
      </Section>

      <Section title="Overlays">
        <div className="rp-row">
          <button
            className="rp-btn rp-btn--secondary"
            onClick={() => setModalOpen(true)}
          >
            Open modal
          </button>
          <button
            className="rp-btn rp-btn--secondary"
            onClick={() => setSheetOpen(true)}
          >
            Open sheet
          </button>
        </div>
      </Section>

      <Section title="Toast">
        <div className="rp-toast rp-toast--success" role="status">
          <span aria-hidden="true">✅</span>
          <span>Saved</span>
        </div>
        <div className="rp-toast rp-toast--danger" role="status">
          <span aria-hidden="true">❗</span>
          <span>That didn&rsquo;t work. Please try again.</span>
        </div>
      </Section>

      {modalOpen ? (
        <div className="rp-scrim" onClick={() => setModalOpen(false)}>
          <div
            className="rp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ds-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="rp-modal__title" id="ds-modal-title">
              Delete this product?
            </h3>
            <p style={{ color: "var(--rp-muted)" }}>
              &ldquo;Blue Shirt&rdquo; will be removed. Your AI will stop
              telling customers about it.
            </p>
            <div className="rp-modal__actions">
              <button
                className="rp-btn rp-btn--ghost"
                onClick={() => setModalOpen(false)}
              >
                Keep it
              </button>
              <button
                className="rp-btn rp-btn--danger"
                onClick={() => setModalOpen(false)}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sheetOpen ? (
        <>
          <div className="rp-scrim" onClick={() => setSheetOpen(false)} />
          <div className="rp-sheet" role="dialog" aria-modal="true">
            <div className="rp-sheet__handle" />
            <h3 className="rp-modal__title">Edit order</h3>
            <div className="rp-field" style={{ marginTop: 16 }}>
              <label className="rp-label" htmlFor="ds-sheet">
                Customer name
              </label>
              <input id="ds-sheet" className="rp-input" defaultValue="Karim" />
            </div>
            <button
              className="rp-btn rp-btn--primary rp-btn--block"
              style={{ marginTop: 24 }}
              onClick={() => setSheetOpen(false)}
            >
              Save
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}
