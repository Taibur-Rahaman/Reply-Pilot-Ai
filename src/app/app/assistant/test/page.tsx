"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/friendly-errors";
import { useToast } from "@/components/ui/Toast";

/**
 * Test my AI.
 *
 * The old equivalent lived on the developer-facing "Admin lite" page and
 * printed its result as `[${data.source}] ${data.reply}` inside a <pre>. Here
 * it is a chat, because that is what the owner is actually testing.
 */

type Turn = { id: number; from: "me" | "ai"; text: string };

export default function TestPage() {
  const toast = useToast();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question) return;

    const id = Date.now();
    setTurns((prev) => [...prev, { id, from: "me", text: question }]);
    setText("");
    setThinking(true);

    const result = await apiFetch<{ reply?: string }>("/api/bot/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: question }),
    });
    setThinking(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setTurns((prev) => [
      ...prev,
      {
        id: id + 1,
        from: "ai",
        // `source` (cache/llm/faq) is an internal detail — never shown.
        text: result.data.reply || "…",
      },
    ]);
  }

  return (
    <div className="rp-stack rp-stack--lg">
      <Link
        href="/app/assistant"
        className="rp-btn rp-btn--ghost"
        style={{ alignSelf: "flex-start" }}
      >
        ← AI Assistant
      </Link>

      <h1 className="rp-page-title">Test my AI</h1>
      <p style={{ color: "var(--rp-muted)" }}>
        Ask something a customer might ask. Nothing here is sent to real
        customers.
      </p>

      <div className="rp-card">
        {turns.length === 0 ? (
          <p style={{ color: "var(--rp-muted)" }}>
            Try asking &ldquo;How much does it cost?&rdquo;
          </p>
        ) : (
          <div className="rp-chat">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={
                  turn.from === "me"
                    ? "rp-bubble rp-bubble--me"
                    : "rp-bubble rp-bubble--ai"
                }
              >
                {turn.text}
              </div>
            ))}
            {thinking ? (
              <div className="rp-bubble rp-bubble--ai" role="status">
                Your AI is typing…
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form className="rp-stack" onSubmit={send}>
        <div className="rp-field">
          <label className="rp-label" htmlFor="test-input">
            Ask your AI something
          </label>
          <input
            id="test-input"
            className="rp-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="How much does it cost?"
          />
        </div>
        <button
          type="submit"
          className="rp-btn rp-btn--primary rp-btn--block"
          disabled={thinking}
        >
          {thinking ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
