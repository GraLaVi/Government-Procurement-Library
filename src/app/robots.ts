import type { MetadataRoute } from "next";
import { DISALLOWED_PREFIXES, SITE_URL } from "@/lib/sitemap";

// Serves https://www.gphusa.com/robots.txt, including the `Sitemap:` line that
// points crawlers at /sitemap.xml. Prerendered at build time alongside it.
//
// Note what this does NOT do: robots.txt governs CRAWLING, not indexing. A
// disallowed URL can still be indexed from inbound links, showing up with no
// snippet. Anything that must stay out of results needs a `robots: { index:
// false }` metadata export on the route itself.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...DISALLOWED_PREFIXES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
