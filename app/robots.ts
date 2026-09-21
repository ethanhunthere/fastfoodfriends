import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * `ntfy.sh` and `api/health` are implementation/ops details, and the
 * confirmation page is a transient receipt — neither needs indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/faleminderit",
          "/api/health",
          "/_next",
          "/icon.svg",
          "/apple-icon.png",
        ],
      },
      {
        userAgent: "Applebot",
        allow: "/",
        disallow: ["/faleminderit"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
