import type { ReactNode } from "react";
import type { Metadata } from "next";

/**
 * Internal development aid, not a product page. Linked from nowhere and
 * excluded from the sitemap, but that alone doesn't stop a crawler that finds
 * the URL some other way.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
