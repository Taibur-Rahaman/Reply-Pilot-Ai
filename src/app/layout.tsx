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
  title: `${SITE_NAME} — AI Messenger Sales Agent for Bangladesh`,
  description:
    "ReplyPilot AI automates Facebook Messenger sales — Bangla-first AI agent, catalog, orders, and dashboard. Plans from ৳1,990/mo. Typical use — no extra API or hosting charge.",
  openGraph: {
    title: `${SITE_NAME} — AI Messenger Sales Agent`,
    description:
      "Messenger AI sales agent + dashboard for BD businesses. Login at /login to manage inbox, catalog, and orders.",
    type: "website",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${syne.variable} ${sora.variable} ${notoBengali.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
