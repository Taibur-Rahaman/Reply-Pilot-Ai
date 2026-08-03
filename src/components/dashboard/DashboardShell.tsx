"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { DASHBOARD_PATH, LOGIN_PATH, SITE_NAME } from "@/lib/config";

const NAV = [
  { href: DASHBOARD_PATH, label: "Overview" },
  { href: "/dashboard/chats", label: "Inbox" },
  { href: "/dashboard/leads", label: "Leads / CRM" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/complaints", label: "Complaints" },
  { href: "/dashboard/catalog", label: "Catalog" },
  { href: "/dashboard/recommendations", label: "Recommendations" },
  { href: "/dashboard/ecommerce", label: "Ecommerce" },
  { href: "/dashboard/knowledge", label: "Knowledge" },
  { href: "/dashboard/comments", label: "Comments AI" },
  { href: "/dashboard/connect", label: "Connect" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/planned", label: "Roadmap" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.replace(LOGIN_PATH);
        return;
      }
      const data = await res.json();
      setName(data.session?.name || data.session?.email || "");
      setReady(true);
    })();
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(LOGIN_PATH);
  }

  if (!ready) {
    return (
      <main className="dash">
        <p className="dash__muted">Loading dashboard…</p>
      </main>
    );
  }

  return (
    <div className="dash">
      <aside className="dash__nav">
        <p className="brand-mark brand-mark--sm">{SITE_NAME}</p>
        <p className="dash__tenant">{name || "Ops"}</p>
        <nav>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                pathname === item.href ||
                (item.href !== DASHBOARD_PATH && pathname.startsWith(item.href))
                  ? "dash__link dash__link--active"
                  : "dash__link"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="dash__nav-foot">
          <Link href="/admin" className="dash__link">
            Admin lite
          </Link>
          <Link href="/" className="dash__link">
            Landing
          </Link>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="dash__main">{children}</main>
    </div>
  );
}
