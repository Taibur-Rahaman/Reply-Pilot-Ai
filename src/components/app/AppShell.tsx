"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LOGIN_PATH, SITE_NAME } from "@/lib/config";
import { apiFetch } from "@/lib/friendly-errors";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * The app shell: five destinations, sidebar on desktop and a bottom tab bar on
 * phones.
 *
 * Replaces the previous 14-item text sidebar (plus "Admin lite" and "Landing"
 * links). Everything that used to be a top-level nav entry now lives inside one
 * of these five, or behind Settings → Advanced. See docs/REDESIGN-SPEC.md §D.
 */

const NAV = [
  { href: "/app", label: "Home", icon: "🏠" },
  { href: "/app/messages", label: "Messages", icon: "💬" },
  { href: "/app/assistant", label: "AI", icon: "🤖" },
  { href: "/app/customers", label: "Customers", icon: "👥" },
  { href: "/app/settings", label: "Settings", icon: "⚙️" },
] as const;

type Session = { name?: string; email?: string };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    void (async () => {
      const result = await apiFetch<{ session: Session }>("/api/auth/me");
      if (!result.ok) {
        router.replace(LOGIN_PATH);
        return;
      }
      setName(result.data.session?.name || result.data.session?.email || "");
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    // Skeletons rather than a "Loading…" string — on a slow connection a bare
    // word reads as a broken page to someone who isn't sure what to expect.
    return (
      <main className="rp-page">
        <div className="rp-stack" aria-busy="true" aria-label="Loading">
          <div className="rp-skeleton rp-skeleton--row" />
          <div className="rp-skeleton rp-skeleton--row" />
          <div className="rp-skeleton rp-skeleton--row" />
        </div>
      </main>
    );
  }

  return (
    <ToastProvider>
      <a className="rp-skip-link" href="#rp-main">
        Skip to content
      </a>
      <div className="rp-shell">
        <nav className="rp-nav" aria-label="Main">
          <p className="rp-nav__brand">{SITE_NAME}</p>
          {NAV.map((item) => {
            // Home must match exactly or it would stay highlighted on every
            // nested route, since every path starts with /app.
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active ? "rp-nav__link rp-nav__link--active" : "rp-nav__link"
                }
              >
                <span className="rp-nav__icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="rp-nav__foot">
            <p className="rp-hint" style={{ padding: "0 var(--rp-space-2)" }}>
              {name}
            </p>
          </div>
        </nav>
        <main id="rp-main" className="rp-page">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
