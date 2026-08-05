"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, type FriendlyError } from "@/lib/friendly-errors";

/**
 * Home.
 *
 * Replaces the old Overview, which opened with a pass/fail list of environment
 * variable names and a "Tenant … · Role …" line. This page answers one
 * question — what needs me today — with tappable action cards, then shows four
 * plain numbers. No charts, no cost estimate, no configuration status.
 */

type Summary = {
  analytics: {
    todayConversations: number;
    todayOrders: number;
    todayRevenue: number;
    conversations: number;
    openLeads: number;
    leads: number;
  };
  connect: { appId: boolean };
  config: { businessName: string };
};

type Attention = {
  waitingChats: number;
  ordersToPack: number;
  unhappyCustomers: number;
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [attention, setAttention] = useState<Attention>({
    waitingChats: 0,
    ordersToPack: 0,
    unhappyCustomers: 0,
  });
  const [connected, setConnected] = useState<boolean | null>(null);
  const [pageName, setPageName] = useState("");
  const [error, setError] = useState<FriendlyError | null>(null);

  useEffect(() => {
    void (async () => {
      const [summaryRes, chatsRes, ordersRes, complaintsRes, connectRes] =
        await Promise.all([
          apiFetch<Summary>("/api/dashboard/summary"),
          apiFetch<{ conversations?: { handoffActive?: boolean }[] }>(
            "/api/dashboard/chats",
          ),
          apiFetch<{ orders?: { trackingStatus?: string }[] }>(
            "/api/dashboard/orders",
          ),
          apiFetch<{ complaints?: { status?: string }[] }>(
            "/api/dashboard/complaints",
          ),
          apiFetch<{ pages?: { pageName: string }[] }>("/api/connect"),
        ]);

      if (!summaryRes.ok) {
        setError(summaryRes.error);
        return;
      }
      setSummary(summaryRes.data);

      setAttention({
        waitingChats: chatsRes.ok
          ? (chatsRes.data.conversations || []).filter((c) => c.handoffActive)
              .length
          : 0,
        ordersToPack: ordersRes.ok
          ? (ordersRes.data.orders || []).filter(
              (o) =>
                o.trackingStatus === "new" || o.trackingStatus === "confirmed",
            ).length
          : 0,
        unhappyCustomers: complaintsRes.ok
          ? (complaintsRes.data.complaints || []).filter(
              (c) => c.status !== "resolved" && c.status !== "closed",
            ).length
          : 0,
      });

      const pages = connectRes.ok ? connectRes.data.pages || [] : [];
      setConnected(pages.length > 0);
      setPageName(pages[0]?.pageName || "");
    })();
  }, []);

  if (error) {
    return (
      <div className="rp-banner rp-banner--danger" role="alert">
        <span className="rp-banner__icon" aria-hidden="true">
          ❗
        </span>
        <span>{error.message}</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rp-stack" aria-busy="true" aria-label="Loading">
        <div className="rp-skeleton rp-skeleton--row" />
        <div className="rp-skeleton rp-skeleton--row" />
        <div className="rp-skeleton rp-skeleton--row" />
      </div>
    );
  }

  const a = summary.analytics;
  const answered = Math.max(
    (a.todayConversations || 0) - attention.waitingChats,
    0,
  );

  const cards = [
    {
      show: attention.waitingChats > 0,
      href: "/app/messages",
      icon: "💬",
      title: `${attention.waitingChats} ${
        attention.waitingChats === 1 ? "customer is" : "customers are"
      } waiting`,
      sub: "They need a reply from you",
    },
    {
      show: attention.ordersToPack > 0,
      href: "/app/customers?tab=orders",
      icon: "📦",
      title: `${attention.ordersToPack} ${
        attention.ordersToPack === 1 ? "order" : "orders"
      } to pack`,
      sub: "Ready to send to your customers",
    },
    {
      show: attention.unhappyCustomers > 0,
      href: "/app/customers",
      icon: "⚠️",
      title: `${attention.unhappyCustomers} unhappy ${
        attention.unhappyCustomers === 1 ? "customer" : "customers"
      }`,
      sub: "Someone has a problem to fix",
    },
  ].filter((c) => c.show);

  return (
    <div className="rp-stack rp-stack--xl">
      <div>
        <h1 className="rp-page-title">{greeting()}</h1>
        <p style={{ color: "var(--rp-muted)" }}>
          {answered > 0
            ? `Your AI answered ${answered} ${answered === 1 ? "customer" : "customers"} today.`
            : "Your AI is ready for today's customers."}
        </p>
      </div>

      {connected === false ? (
        <Link href="/welcome" className="rp-action-card">
          <span className="rp-action-card__icon" aria-hidden="true">
            📘
          </span>
          <span className="rp-action-card__text">
            <span className="rp-action-card__title">
              Connect your Facebook Page
            </span>
            <span className="rp-action-card__sub">
              Your AI can&rsquo;t answer customers until you do this
            </span>
          </span>
          <span className="rp-action-card__chevron" aria-hidden="true">
            ›
          </span>
        </Link>
      ) : connected === true ? (
        <div className="rp-banner rp-banner--success">
          <span className="rp-banner__icon" aria-hidden="true">
            ✅
          </span>
          <span>
            Your AI is working
            {pageName ? (
              <>
                {" "}
                — connected to <strong>{pageName}</strong>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {cards.length > 0 ? (
        <section>
          <h2 className="rp-section-title">Needs your attention</h2>
          <div className="rp-stack">
            {cards.map((card) => (
              <Link key={card.title} href={card.href} className="rp-action-card">
                <span className="rp-action-card__icon" aria-hidden="true">
                  {card.icon}
                </span>
                <span className="rp-action-card__text">
                  <span className="rp-action-card__title">{card.title}</span>
                  <span className="rp-action-card__sub">{card.sub}</span>
                </span>
                <span className="rp-action-card__chevron" aria-hidden="true">
                  ›
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="rp-banner rp-banner--info">
          <span className="rp-banner__icon" aria-hidden="true">
            👍
          </span>
          <span>Nothing needs you right now. Your AI is handling things.</span>
        </div>
      )}

      <section>
        <h2 className="rp-section-title">Today</h2>
        <div className="rp-grid-2">
          <div className="rp-stat">
            <span className="rp-stat__value">{a.todayConversations ?? 0}</span>
            <span className="rp-stat__label">Customers</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat__value">{a.todayOrders ?? 0}</span>
            <span className="rp-stat__label">Orders</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat__value">
              ৳{Math.round(a.todayRevenue ?? 0).toLocaleString()}
            </span>
            <span className="rp-stat__label">Earned</span>
          </div>
          <div className="rp-stat">
            <span className="rp-stat__value">{answered}</span>
            <span className="rp-stat__label">AI replied</span>
          </div>
        </div>
      </section>
    </div>
  );
}
