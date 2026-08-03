"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Settings = {
  autoReplyEnabled: boolean;
  autoReplyText: string;
  spamKeywords: string[];
  leadCaptureEnabled: boolean;
};

type Event = {
  id: string;
  text: string;
  authorName?: string;
  isSpam: boolean;
  autoReplied: boolean;
  replyText?: string;
  leadId?: string;
  createdAt: string;
};

export default function CommentsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [simText, setSimText] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/comments");
    const data = await res.json();
    if (res.ok) {
      setSettings(data.settings);
      setEvents(data.events || []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setStatus("Saving…");
    await fetch("/api/dashboard/comments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        spamKeywords: settings.spamKeywords,
      }),
    });
    setStatus("Saved");
    await load();
  }

  async function simulate(event: FormEvent) {
    event.preventDefault();
    setStatus("Processing…");
    const res = await fetch("/api/dashboard/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: simText,
        authorName: "Comment simulator",
      }),
    });
    const data = await res.json();
    setStatus(
      res.ok
        ? `spam=${data.spam} autoReply=${data.autoReplied} lead=${data.leadId || "—"}`
        : data.error || "Fail",
    );
    setSimText("");
    await load();
  }

  return (
    <div>
      <h1 className="dash__title">Facebook Comment AI</h1>
      <p className="dash__lead">
        Spam keyword flagging, auto-reply text, and lead capture into CRM. Live
        Graph delete/reply needs Page token + App Review — processing works now
        via <code>POST /api/comments</code>.
      </p>

      {settings ? (
        <form className="dash-panel dash-form-grid" onSubmit={save}>
          <h2>Settings</h2>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={settings.autoReplyEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  autoReplyEnabled: e.target.checked,
                })
              }
            />
            <span>Auto-reply enabled</span>
          </label>
          <label className="field">
            <span>Auto-reply text</span>
            <textarea
              rows={3}
              value={settings.autoReplyText}
              onChange={(e) =>
                setSettings({ ...settings, autoReplyText: e.target.value })
              }
            />
          </label>
          <label className="field">
            <span>Spam keywords (comma-separated)</span>
            <textarea
              rows={2}
              value={settings.spamKeywords.join(", ")}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  spamKeywords: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="field field--check">
            <input
              type="checkbox"
              checked={settings.leadCaptureEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  leadCaptureEnabled: e.target.checked,
                })
              }
            />
            <span>Lead capture when phone detected</span>
          </label>
          <button className="btn btn--primary" type="submit">
            Save settings
          </button>
        </form>
      ) : null}

      <form className="dash-panel dash-form-grid" onSubmit={simulate}>
        <h2>Simulate comment</h2>
        <label className="field">
          <span>Comment text</span>
          <input
            value={simText}
            onChange={(e) => setSimText(e.target.value)}
            placeholder="Price? 017XXXXXXXX / or spam: free money lottery"
            required
          />
        </label>
        <button className="btn btn--secondary" type="submit">
          Process
        </button>
      </form>

      {status ? <p className="dash__muted">{status}</p> : null}

      <div className="dash-panel">
        <h2>Recent events</h2>
        <ul className="dash-list">
          {events.map((e) => (
            <li key={e.id}>
              <strong>
                {e.isSpam ? "SPAM" : "OK"} · {e.authorName || "anon"}
              </strong>
              <span>{e.text}</span>
              {e.autoReplied ? (
                <span className="dash__muted">Reply: {e.replyText}</span>
              ) : null}
              {e.leadId ? (
                <em className="dash-tag">lead {e.leadId.slice(0, 10)}</em>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
