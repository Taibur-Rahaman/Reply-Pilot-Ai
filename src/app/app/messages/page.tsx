"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/friendly-errors";
import { useToast } from "@/components/ui/Toast";

/**
 * Messages.
 *
 * Replaces the old Inbox, whose first panel was a "Demo ingest (channel stubs)"
 * form and which printed message direction as the raw strings `in` / `out`.
 * Also absorbs the separate "Comments AI" screen as a second tab.
 *
 * Channel filters are gone: the stub channels (WhatsApp, Instagram, Telegram)
 * implied integrations that do not exist, and the audience does not think in
 * channels — they think in customers.
 */

type Convo = {
  id: string;
  senderId: string;
  senderName?: string;
  handoffActive: boolean;
  complaintTagged?: boolean;
  lastMessageAt: string;
  preview?: string;
};

type Message = {
  id: string;
  direction: string;
  text: string;
  createdAt: string;
};

type CommentEvent = {
  id: string;
  text: string;
  authorName?: string;
  isSpam: boolean;
  autoReplied: boolean;
  replyText?: string;
};

function initials(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export default function MessagesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"chats" | "comments">("chats");
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [comments, setComments] = useState<CommentEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // See the note in assistant/products — each fetch lives in its effect so a
  // response that lands after unmount (or after the user opens a different
  // conversation) is dropped rather than setting state.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiFetch<{ conversations?: Convo[] }>(
        "/api/dashboard/chats",
      );
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setConversations(result.data.conversations || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (tab !== "comments") return;
    let cancelled = false;
    void (async () => {
      const result = await apiFetch<{ events?: CommentEvent[] }>(
        "/api/dashboard/comments",
      );
      if (cancelled) return;
      if (result.ok) setComments(result.data.events || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    void (async () => {
      const result = await apiFetch<{ messages?: Message[] }>(
        `/api/dashboard/chats?conversationId=${encodeURIComponent(selected)}`,
      );
      if (cancelled) return;
      if (result.ok) setMessages(result.data.messages || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  async function setHandoff(action: "take" | "leave") {
    if (!selected) return;
    const result = await apiFetch("/api/dashboard/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selected, action }),
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      action === "take"
        ? "You're replying to this customer now"
        : "Your AI is replying again",
    );
    reload();
  }

  const current = conversations.find((c) => c.id === selected);

  /* ------------------------------------------------------ conversation view */

  if (selected && current) {
    return (
      <div className="rp-stack rp-stack--lg">
        <button
          type="button"
          className="rp-btn rp-btn--ghost"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setSelected(null)}
        >
          ← All messages
        </button>

        <div className="rp-row">
          <span className="rp-avatar">
            {initials(current.senderName || "?")}
          </span>
          <h1 style={{ fontSize: "var(--rp-text-xl)" }}>
            {current.senderName || "Customer"}
          </h1>
        </div>

        <div className="rp-card">
          <div className="rp-chat">
            {messages.map((m) => {
              // `direction` is an internal enum. Customers see "them" vs "your
              // AI", which is the only distinction that matters to the owner.
              const fromCustomer = m.direction === "in";
              return (
                <div
                  key={m.id}
                  className={
                    fromCustomer
                      ? "rp-bubble rp-bubble--customer"
                      : "rp-bubble rp-bubble--ai"
                  }
                >
                  {m.text}
                  <span className="rp-bubble__meta">
                    {fromCustomer
                      ? current.senderName || "Customer"
                      : "Your AI"}{" "}
                    · {timeAgo(m.createdAt)}
                  </span>
                </div>
              );
            })}
            {messages.length === 0 ? (
              <p style={{ color: "var(--rp-muted)" }}>No messages yet.</p>
            ) : null}
          </div>
        </div>

        {current.handoffActive ? (
          <button
            type="button"
            className="rp-btn rp-btn--primary rp-btn--block"
            onClick={() => void setHandoff("leave")}
          >
            Let AI continue
          </button>
        ) : (
          <button
            type="button"
            className="rp-btn rp-btn--primary rp-btn--block"
            onClick={() => void setHandoff("take")}
          >
            I&rsquo;ll reply myself
          </button>
        )}
      </div>
    );
  }

  /* ----------------------------------------------------------- list view */

  return (
    <div className="rp-stack rp-stack--lg">
      <h1 className="rp-page-title">Messages</h1>

      <div className="rp-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "chats"}
          className="rp-tab"
          onClick={() => setTab("chats")}
        >
          Chats{conversations.length > 0 ? ` (${conversations.length})` : ""}
        </button>
        <button
          role="tab"
          aria-selected={tab === "comments"}
          className="rp-tab"
          onClick={() => setTab("comments")}
        >
          Facebook comments
        </button>
      </div>

      {tab === "chats" ? (
        loading ? (
          <div className="rp-stack" aria-busy="true">
            <div className="rp-skeleton rp-skeleton--row" />
            <div className="rp-skeleton rp-skeleton--row" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="rp-empty">
            <span className="rp-empty__icon" aria-hidden="true">
              💬
            </span>
            <span className="rp-empty__title">No messages yet</span>
            <span className="rp-empty__body">
              When someone messages your Facebook page, their message appears
              here and your AI answers it.
            </span>
          </div>
        ) : (
          <div className="rp-list">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                className="rp-list-row"
                onClick={() => setSelected(c.id)}
              >
                <span className="rp-avatar">
                  {initials(c.senderName || "?")}
                </span>
                <span className="rp-list-row__text">
                  <span className="rp-list-row__title">
                    {c.senderName || "Customer"}
                  </span>
                  <span className="rp-list-row__sub">{c.preview || "—"}</span>
                  <span className="rp-list-row__sub">
                    {timeAgo(c.lastMessageAt)}
                  </span>
                </span>
                {c.handoffActive ? (
                  <span className="rp-badge rp-badge--warning">
                    ● Waiting for you
                  </span>
                ) : (
                  <span className="rp-badge rp-badge--success">
                    ✓ AI replied
                  </span>
                )}
              </button>
            ))}
          </div>
        )
      ) : comments.length === 0 ? (
        <div className="rp-empty">
          <span className="rp-empty__icon" aria-hidden="true">
            📝
          </span>
          <span className="rp-empty__title">No comments yet</span>
          <span className="rp-empty__body">
            When someone comments on your Facebook posts, your AI can answer
            them here.
          </span>
        </div>
      ) : (
        <div className="rp-list">
          {comments.map((event) => (
            <div key={event.id} className="rp-list-row">
              <span className="rp-avatar">
                {initials(event.authorName || "?")}
              </span>
              <span className="rp-list-row__text">
                <span className="rp-list-row__title">
                  {event.authorName || "Someone"}
                </span>
                <span className="rp-list-row__sub">{event.text}</span>
                {event.autoReplied && event.replyText ? (
                  <span className="rp-list-row__sub">
                    Your AI replied: {event.replyText}
                  </span>
                ) : null}
              </span>
              {event.isSpam ? (
                <span className="rp-badge rp-badge--danger">! Spam</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
