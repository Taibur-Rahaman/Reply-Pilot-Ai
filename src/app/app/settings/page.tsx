"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/friendly-errors";
import { useToast } from "@/components/ui/Toast";
import { LOGIN_PATH } from "@/lib/config";

/**
 * Settings.
 *
 * Absorbs Connect, Team, and Ecommerce. Everything a non-technical owner should
 * never have to see — AI instructions, reply accuracy, online-shop API keys —
 * sits behind a collapsed "Advanced Settings" section with a plain warning.
 *
 * The old sidebar links to "Admin lite" and the landing page are gone.
 */

type PageConn = { id: string; pageName: string; status: string };
type Member = { id: string; name: string; email: string; role: string };

/** Internal role → what it means to a shop owner. */
const ROLE_LABEL: Record<string, string> = {
  admin: "Owner",
  manager: "Manager",
  moderator: "Helper",
  agent: "Helper",
};

export default function SettingsPage() {
  const toast = useToast();
  const router = useRouter();
  const [pages, setPages] = useState<PageConn[]>([]);
  const [team, setTeam] = useState<Member[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [loadingAdvanced, setLoadingAdvanced] = useState(false);

  useEffect(() => {
    void (async () => {
      const [connectRes, teamRes] = await Promise.all([
        apiFetch<{ pages?: PageConn[] }>("/api/connect"),
        apiFetch<{ users?: Member[] }>("/api/dashboard/team"),
      ]);
      if (connectRes.ok) setPages(connectRes.data.pages || []);
      if (teamRes.ok) setTeam(teamRes.data.users || []);
    })();
  }, []);

  // The AI instructions are only fetched when the section is opened — there is
  // no reason to pull them for the 99% of visits that never expand Advanced.
  async function openAdvanced() {
    setAdvancedOpen((open) => !open);
    if (advancedOpen || instructions) return;
    setLoadingAdvanced(true);
    const result = await apiFetch<{ config?: { systemPrompt?: string } }>(
      "/api/dashboard/knowledge",
    );
    setLoadingAdvanced(false);
    if (result.ok) setInstructions(result.data.config?.systemPrompt || "");
  }

  async function saveInstructions() {
    const result = await apiFetch("/api/dashboard/knowledge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_config", systemPrompt: instructions }),
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Saved");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(LOGIN_PATH);
  }

  return (
    <div className="rp-stack rp-stack--lg">
      <h1 className="rp-page-title">Settings</h1>

      <div className="rp-card rp-stack">
        <p className="rp-card__title">📘 My Facebook Page</p>
        {pages.length > 0 ? (
          <>
            <span className="rp-badge rp-badge--success">
              ✓ Connected — {pages[0].pageName}
            </span>
            <p className="rp-card__body">
              Your AI is answering customers on this page.
            </p>
          </>
        ) : (
          <>
            <p className="rp-card__body">
              Your AI can&rsquo;t answer customers until you connect your page.
            </p>
            <a
              className="rp-btn rp-btn--primary rp-btn--block"
              href="/welcome"
            >
              Connect My Facebook Page
            </a>
          </>
        )}
      </div>

      <div className="rp-card rp-stack">
        <p className="rp-card__title">👥 My Team</p>
        {team.length === 0 ? (
          <p className="rp-card__body">
            It&rsquo;s just you right now.
          </p>
        ) : (
          <div className="rp-stack">
            {team.map((member) => (
              <div key={member.id} className="rp-row">
                <span className="rp-avatar">
                  {(member.name || "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="rp-list-row__text">
                  <span className="rp-list-row__title">{member.name}</span>
                  <span className="rp-list-row__sub">{member.email}</span>
                </span>
                <span className="rp-badge">
                  {ROLE_LABEL[member.role] || "Helper"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rp-card rp-stack">
        <p className="rp-card__title">👤 My Account</p>
        <button
          type="button"
          className="rp-btn rp-btn--secondary rp-btn--block"
          onClick={() => void logout()}
        >
          Log out
        </button>
      </div>

      {/* ------------------------------------------------------- advanced */}

      <div>
        <button
          type="button"
          className="rp-btn rp-btn--ghost rp-btn--block"
          aria-expanded={advancedOpen}
          onClick={() => void openAdvanced()}
        >
          ⚙️ Advanced Settings {advancedOpen ? "▾" : "▸"}
        </button>

        {advancedOpen ? (
          <div className="rp-stack" style={{ marginTop: "var(--rp-space-2)" }}>
            <div className="rp-banner rp-banner--warning">
              <span className="rp-banner__icon" aria-hidden="true">
                ⚠️
              </span>
              <span>
                Only change these if you know what you&rsquo;re doing. Your AI
                already works without them.
              </span>
            </div>

            <div className="rp-card rp-stack">
              <p className="rp-card__title">AI Instructions</p>
              <p className="rp-card__body">
                The exact instructions your AI follows. We wrote these from your
                answers when you set up.
              </p>
              {loadingAdvanced ? (
                <div className="rp-skeleton rp-skeleton--row" />
              ) : (
                <>
                  <div className="rp-field">
                    <label className="rp-sr-only" htmlFor="ai-instructions">
                      AI Instructions
                    </label>
                    <textarea
                      id="ai-instructions"
                      className="rp-input"
                      rows={10}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="rp-btn rp-btn--secondary rp-btn--block"
                    onClick={() => void saveInstructions()}
                  >
                    Save instructions
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
