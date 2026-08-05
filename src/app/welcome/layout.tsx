import type { ReactNode } from "react";
import type { Metadata } from "next";

/** Onboarding is reached only after sign-in — keep it out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return children;
}
