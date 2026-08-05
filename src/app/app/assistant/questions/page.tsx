"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/friendly-errors";
import { useToast } from "@/components/ui/Toast";

/**
 * Common questions.
 *
 * The FAQ half of the old Knowledge screen, on its own and in plain words. The
 * upload/extract panel ("PDF / Excel / CSV / TXT extract best-effort. DOCX
 * accepted as stub") and the five non-functional "Connect sources (stubs)"
 * buttons are gone — they recorded an intent and did nothing.
 */

type Faq = { id: string; question: string; answer: string };

export default function QuestionsPage() {
  const toast = useToast();
  const [faq, setFaq] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // See the note in assistant/products — the fetch lives in the effect so a
  // response that lands after unmount is dropped rather than setting state.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiFetch<{ faq?: Faq[] }>(
        "/api/dashboard/knowledge",
      );
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setFaq(result.data.faq || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function add(event: FormEvent) {
    event.preventDefault();
    const result = await apiFetch("/api/dashboard/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert_faq", question, answer }),
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Your AI learned this");
    setQuestion("");
    setAnswer("");
    setAdding(false);
    reload();
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

      <h1 className="rp-page-title">Common questions</h1>
      <p style={{ color: "var(--rp-muted)" }}>
        Teach your AI the questions customers ask most, and what to answer.
      </p>

      {adding ? (
        <form className="rp-card rp-stack rp-stack--lg" onSubmit={add}>
          <div className="rp-field">
            <label className="rp-label" htmlFor="q-question">
              What do customers ask?
            </label>
            <input
              id="q-question"
              className="rp-input"
              required
              autoFocus
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Do you deliver to Mirpur?"
            />
          </div>
          <div className="rp-field">
            <label className="rp-label" htmlFor="q-answer">
              What should your AI say?
            </label>
            <textarea
              id="q-answer"
              className="rp-input"
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Yes, we deliver to Mirpur. It costs ৳60 and takes 1 day."
            />
          </div>
          <button type="submit" className="rp-btn rp-btn--primary rp-btn--block">
            Save this answer
          </button>
          <button
            type="button"
            className="rp-btn rp-btn--ghost"
            onClick={() => setAdding(false)}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="rp-btn rp-btn--primary rp-btn--block"
          onClick={() => setAdding(true)}
        >
          + Add a question
        </button>
      )}

      {loading ? (
        <div className="rp-stack" aria-busy="true">
          <div className="rp-skeleton rp-skeleton--row" />
        </div>
      ) : faq.length === 0 ? (
        <div className="rp-empty">
          <span className="rp-empty__icon" aria-hidden="true">
            ❓
          </span>
          <span className="rp-empty__title">No questions saved yet</span>
          <span className="rp-empty__body">
            Add the questions your customers ask most, so your AI always answers
            them the way you would.
          </span>
        </div>
      ) : (
        <div className="rp-stack">
          {faq.map((item) => (
            <div key={item.id} className="rp-card">
              <p className="rp-card__title">{item.question}</p>
              <p className="rp-card__body">{item.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
