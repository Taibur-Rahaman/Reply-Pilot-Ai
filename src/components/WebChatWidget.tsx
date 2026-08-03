"use client";

import { FormEvent, useState } from "react";

export function WebChatWidget() {
  const [open, setOpen] = useState(false);
  const [senderId, setSenderId] = useState("");
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ role: string; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    const msg = text.trim();
    setText("");
    setLog((prev) => [...prev, { role: "you", text: msg }]);
    setBusy(true);
    try {
      const res = await fetch("/api/webchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg,
          senderId: senderId || undefined,
          senderName: "Website visitor",
        }),
      });
      const data = await res.json();
      if (data.senderId && !senderId) setSenderId(data.senderId);
      if (data.reply) {
        setLog((prev) => [...prev, { role: "ai", text: data.reply }]);
      }
    } catch {
      setLog((prev) => [
        ...prev,
        { role: "ai", text: "Network error — try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="webchat">
      {open ? (
        <div className="webchat__panel" role="dialog" aria-label="Website chat">
          <header className="webchat__head">
            <strong>FaceTai</strong>
            <button type="button" onClick={() => setOpen(false)}>
              ×
            </button>
          </header>
          <div className="webchat__log">
            {log.length === 0 ? (
              <p className="webchat__hint">
                Ask about price, stock, or delivery — replies land in the
                Omnichannel Inbox (web).
              </p>
            ) : null}
            {log.map((m, i) => (
              <p key={i} data-role={m.role}>
                {m.text}
              </p>
            ))}
          </div>
          <form className="webchat__form" onSubmit={send}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              disabled={busy}
            />
            <button type="submit" disabled={busy}>
              Send
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        className="webchat__fab"
        onClick={() => setOpen((v) => !v)}
      >
        Chat
      </button>
    </div>
  );
}
