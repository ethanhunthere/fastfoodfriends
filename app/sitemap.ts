import type { MetadataRoute } from "next";
import { getSitemapEntries, SITE_URL } from "@/lib/seo";

/**
 * Static sitemap covering the home, menu + every dish page.
 * Revalidates in step with the menu so new dishes drop out of the index fast.
 */
export const revalidate = 300; // = HOURS_REVALIDATE_SECONDS (must be a literal for Next)

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const lastModified = now.toISOString();

  return getSitemapEntries().map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency:
      path === "/"
        ? "hourly"
        : path.startsWith("/menu/")
          ? "weekly"
          : "daily",
    priority:
      path === "/" ? 1 : path === "/menu" || path === "/kontakt" ? 0.8 : 0.7,
  }));
}
