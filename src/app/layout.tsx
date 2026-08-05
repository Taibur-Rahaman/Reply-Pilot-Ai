import type { Metadata } from "next";
import { Noto_Sans_Bengali, Sora, Syne } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — AI Messenger Sales Agent for Bangladesh`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "ReplyPilot AI automates Facebook Messenger sales — Bangla-first AI agent, catalog, orders, and dashboard. Plans from ৳1,990/mo. Typical use — no extra API or hosting charge.",
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${SITE_NAME} — AI Messenger Sales Agent`,
    description:
      "Messenger AI sales agent + dashboard for BD businesses. Login at /login to manage inbox, catalog, and orders.",
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI Messenger Sales Agent`,
    description:
      "Messenger AI sales agent + dashboard for BD businesses.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The `h-full antialiased` / `min-h-full` utilities that used to sit here
    // were the only Tailwind in the app. base.css now owns those declarations,
    // so the framework import could be dropped entirely.
    <html
      lang="bn"
      className={`${syne.variable} ${sora.variable} ${notoBengali.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
