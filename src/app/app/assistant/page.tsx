"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/friendly-errors";

/**
 * AI Assistant hub.
 *
 * Replaces the old "AI Knowledge Hub", which put a system-prompt textarea, a
 * "Hard guardrails" fieldset, and a "Confidence threshold (0–1)" numeric input
 * on the same screen as the business name. Everything technical now lives
 * under Settings → Advanced; this page is four plain choices.
 */

type Knowledge = {
  faq?: { id: string }[];
  config?: { businessName?: string };
};

export default function AssistantPage() {
  const [faqCount, setFaqCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    void (async () => {
      const [knowledge, products] = await Promise.all([
        apiFetch<Knowledge>("/api/dashboard/knowledge"),
        apiFetch<{ products?: unknown[] }>("/api/dashboard/products"),
      ]);
      if (knowledge.ok) {
        setFaqCount((knowledge.data.faq || []).length);
        setBusinessName(knowledge.data.config?.businessName || "");
      }
      if (products.ok) setProductCount((products.data.products || []).length);
    })();
  }, []);

  const items = [
    {
      href: "/app/assistant/business",
      icon: "🏪",
      title: "My business info",
      sub: businessName
        ? `Name, phone, hours — ${businessName}`
        : "Name, phone, address, hours, delivery",
    },
    {
      href: "/app/assistant/products",
      icon: "🏷️",
      title: "What I sell",
      sub:
        productCount === null
          ? "Loading…"
          : productCount === 0
            ? "Add what you sell so your AI can talk about it"
            : `${productCount} ${productCount === 1 ? "item" : "items"}`,
    },
    {
      href: "/app/assistant/questions",
      icon: "❓",
      title: "Common questions",
      sub:
        faqCount === null
          ? "Loading…"
          : faqCount === 0
            ? "Teach your AI the questions customers ask most"
            : `${faqCount} saved`,
    },
    {
      href: "/app/assistant/test",
      icon: "💬",
      title: "Test my AI",
      sub: "See how it answers before your customers do",
    },
  ];

  return (
    <div className="rp-stack rp-stack--lg">
      <h1 className="rp-page-title">AI Assistant</h1>

      <div className="rp-banner rp-banner--success">
        <span className="rp-banner__icon" aria-hidden="true">
          ✅
        </span>
        <span>
          Your AI answers customers using everything you tell it here.
        </span>
      </div>

      <div className="rp-stack">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rp-action-card">
            <span className="rp-action-card__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="rp-action-card__text">
              <span className="rp-action-card__title">{item.title}</span>
              <span className="rp-action-card__sub">{item.sub}</span>
            </span>
            <span className="rp-action-card__chevron" aria-hidden="true">
              ›
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
