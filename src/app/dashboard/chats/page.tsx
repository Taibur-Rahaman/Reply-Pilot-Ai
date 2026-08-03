"use client";

import { FormEvent, useEffect, useState } from "react";

type Convo = {
  id: string;
  senderId: string;
  senderName?: string;
  channel?: string;
  handoffActive: boolean;
  complaintTagged?: boolean;
  priority?: string;
  lastMessageAt: string;
  preview?: string;
};

type Message = {
  id: string;
  direction: string;
  text: string;
  imageUrl?: string;
  recognition?: {
    productName?: string;
    confidence?: number;
    method?: string;
  };
  createdAt: string;
};

const CHANNELS = ["all", "messenger", "whatsapp", "instagram", "web", "telegram"];

export default function ChatsPage() {
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState("all");
  const [demoText, setDemoText] = useState("");
  const [demoChannel, setDemoChannel] = useState("whatsapp");
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [timeline, setTimeline] = useState<
    { id: string; type: string; title: string; body?: string; createdAt: string }[]
  >([]);

  async function loadConvos(ch = channel) {
    const q = ch && ch !== "all" ? `?channel=${encodeURIComponent(ch)}` : "";
    const res = await fetch(`/api/dashboard/chats${q}`);
    const data = await res.json();
    if (res.ok) setConversations(data.conversations || []);
  }

  useEffect(() => {
    void loadConvos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  useEffect(() => {
    if (!selected) return;
    void (async () => {
      const res = await fetch(
        `/api/dashboard/chats?conversationId=${encodeURIComponent(selected)}`,
      );
      const data = await res.json();
      if (res.ok) setMessages(data.messages || []);
    })();
  }, [selected]);

  async function handoff(action: "take" | "leave") {
    if (!selected) return;
    setStatus(action === "take" ? "Taking over…" : "Releasing…");
    const res = await fetch("/api/dashboard/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selected, action }),
    });
    const data = await res.json();
    setStatus(res.ok ? (action === "take" ? "Human takeover on" : "AI resumed") : data.error || "Fail");
    await loadConvos();
  }

  async function addNote() {
    if (!selected || !note.trim()) return;
    const res = await fetch("/api/dashboard/chats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: selected,
        action: "note",
        note,
      }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Note saved" : data.error || "Fail");
    setNote("");
    await loadTimeline();
  }

  async function loadTimeline() {
    if (!selected) return;
    const res = await fetch(
      `/api/dashboard/chats?conversationId=${encodeURIComponent(selected)}&timeline=1`,
    );
    const data = await res.json();
    if (res.ok) setTimeline(data.timeline || []);
  }

  async function ingestDemo(event: FormEvent) {
    event.preventDefault();
    if (!demoText.trim()) return;
    setStatus("Ingesting…");
    const res = await fetch("/api/dashboard/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: demoChannel,
        text: demoText,
        senderName: `${demoChannel} demo`,
      }),
    });
    const data = await res.json();
    setStatus(res.ok ? `Added to ${demoChannel}` : data.error || "Fail");
    setDemoText("");
    await loadConvos();
    if (data.conversation?.id) setSelected(data.conversation.id);
  }

  return (
    <div>
      <h1 className="dash__title">Omnichannel Inbox</h1>
      <p className="dash__lead">
        All channels in one place — Messenger (live webhook), WhatsApp / Instagram /
        Telegram (connect stubs + demo ingest), Website chat (real via{" "}
        <code>/api/webchat</code>).
      </p>

      <div className="dash-row" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            className={
              channel === ch ? "btn btn--primary" : "btn btn--ghost"
            }
            onClick={() => setChannel(ch)}
          >
            {ch}
          </button>
        ))}
      </div>

      <form className="dash-panel dash-form-grid" onSubmit={ingestDemo}>
        <h2>Demo ingest (channel stubs)</h2>
        <label className="field">
          <span>Channel</span>
          <select
            value={demoChannel}
            onChange={(e) => setDemoChannel(e.target.value)}
          >
            {CHANNELS.filter((c) => c !== "all").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Message</span>
          <input
            value={demoText}
            onChange={(e) => setDemoText(e.target.value)}
            placeholder="Stock ase? / দাম কত?"
          />
        </label>
        <button className="btn btn--secondary" type="submit">
          Add demo message
        </button>
        {status ? <p className="dash__muted">{status}</p> : null}
      </form>

      <div className="dash-split">
        <div className="dash-panel">
          <h2>Threads</h2>
          {conversations.length === 0 ? (
            <p className="dash__muted">
              No chats yet. Message the Page webhook, use website widget, or demo
              ingest above.
            </p>
          ) : (
            <ul className="dash-list">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={
                      selected === c.id
                        ? "dash-list__btn dash-list__btn--active"
                        : "dash-list__btn"
                    }
                    onClick={() => setSelected(c.id)}
                  >
                    <strong>
                      {c.senderName || c.senderId.slice(0, 12)}{" "}
                      <em className="dash-tag">{c.channel || "messenger"}</em>
                    </strong>
                    <span>{c.preview || "—"}</span>
                    {c.handoffActive ? (
                      <em className="dash-tag">handoff</em>
                    ) : null}
                    {c.complaintTagged ? (
                      <em className="dash-tag">complaint {c.priority}</em>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dash-panel">
          <h2>Messages</h2>
          {!selected ? (
            <p className="dash__muted">Select a thread.</p>
          ) : (
            <>
              <div className="dash-row" style={{ marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void handoff("take")}
                >
                  Take over
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void handoff("leave")}
                >
                  Release to AI
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => void loadTimeline()}
                >
                  CRM timeline
                </button>
              </div>
              <form
                className="dash-form-grid"
                style={{ marginBottom: "1rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  void addNote();
                }}
              >
                <label className="field">
                  <span>Agent note</span>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Internal note for this customer…"
                  />
                </label>
                <button className="btn btn--secondary" type="submit">
                  Save note
                </button>
              </form>
              {timeline.length > 0 ? (
                <div style={{ marginBottom: "1rem" }}>
                  <h3>Timeline</h3>
                  <ul className="dash-list">
                    {timeline.map((t) => (
                      <li key={t.id}>
                        <strong>{t.type}</strong> — {t.title}
                        {t.body ? <span> · {t.body}</span> : null}
                        <br />
                        <time className="dash__muted">
                          {new Date(t.createdAt).toLocaleString()}
                        </time>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ul className="dash-messages">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    data-dir={m.direction}
                    className="dash-messages__item"
                  >
                    <span>{m.direction}</span>
                    <p>{m.text}</p>
                    {m.recognition?.productName ? (
                      <p className="dash__muted">
                        Recognized: {m.recognition.productName} (
                        {Math.round((m.recognition.confidence || 0) * 100)}% ·{" "}
                        {m.recognition.method})
                      </p>
                    ) : null}
                    <time>{new Date(m.createdAt).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
