import type { MetadataRoute } from "next";
import { RESTAURANT } from "@/lib/restaurant";

/**
 * Minimal PWA manifest. A real brand would swap `/icon.svg` for a generated
 * 192/512 PNG pack — included here so the share sheet / install banner is valid,
 * without adding any build-time image-generation dependency.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: RESTAURANT.name,
    short_name: RESTAURANT.shortName,
    description: RESTAURANT.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#c73827",
    icons: [
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
