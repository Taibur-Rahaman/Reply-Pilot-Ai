import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Everything behind sign-in, plus internal-only routes. `/app/` is the
        // current dashboard — `/dashboard/` is kept because those paths still
        // resolve as redirects into `/app/` and crawlers may hold old links.
        disallow: [
          "/app/",
          "/dashboard/",
          "/admin/",
          "/api/",
          "/welcome",
          "/design-system",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
