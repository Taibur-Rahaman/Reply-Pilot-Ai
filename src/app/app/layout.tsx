import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";

/**
 * Everything under /app is behind sign-in, so it must never be indexed. The
 * root layout opts the marketing site *into* indexing, and metadata is merged
 * per-branch rather than inherited-and-overridden by robots.txt alone — so
 * without this the whole dashboard is crawlable.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
