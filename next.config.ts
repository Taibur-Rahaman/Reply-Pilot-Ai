import type { NextConfig } from "next";

/**
 * Baseline security headers, applied to every response.
 *
 * Deliberately does not include a Content-Security-Policy: Next.js injects
 * inline bootstrap scripts, so a correct policy needs per-request nonces
 * threaded through the proxy. A wrong CSP shipped at launch breaks the app
 * silently in the browser, which is worse than not having one — tracked in
 * LAUNCH_CHECKLIST.md as follow-up rather than guessed at here.
 */
const securityHeaders = [
  // HTTPS-only for two years, including subdomains. Ignored over plain HTTP,
  // so this is inert in local dev and active behind the production TLS
  // terminator.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Stop browsers second-guessing declared Content-Types (XSS via a
  // user-uploaded file served as text/plain but sniffed as HTML).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nothing here is meant to be embedded cross-site: the chat widget is a
  // React component on our own landing page, not an iframe embed for
  // customer sites. If that changes, this becomes an allowlist.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the full URL only to ourselves; cross-origin requests get the bare
  // origin, so dashboard paths and query strings don't leak in Referer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No page in this app uses these devices; deny them outright.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async redirects() {
    return [
      {
        source: "/dashboard/login",
        destination: "/login",
        permanent: true,
      },
      // Note: Next.js redirect() source matching is case-insensitive, so a
      // "/Dashboard" -> "/dashboard" rule here would also match the correct
      // lowercase URL and redirect it to itself (infinite redirect loop).
      // The capital-D typo redirect is instead handled case-sensitively in
      // src/proxy.ts, which uses exact string comparison.
    ];
  },
};

export default nextConfig;
