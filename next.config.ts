import type { NextConfig } from "next";

/**
 * Performance-first configuration.
 *
 * - `optimizePackageImports` keeps `lucide-react` tree-shakeable so a page only
 *   ships the SVG icons it actually renders.
 * - No middleware and no runtime redirects: the menu is fully static (ISR) so it
 *   can be served straight from the CDN edge.
 * - `poweredByHeader: false` trims bytes from every response.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        // Pre-baked, content-addressed product art: cache forever at the edge
        // and in browsers. New art ships under a new directory version.
        source: "/menu/v3/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Baked neighbourhood map — same treatment as the product art.
        source: "/location/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Brand emblem assets (lossless PNG DPR ladder cut from the 4K master,
      // plus the masters and the original): fixed filenames, cache forever so
      // the navbar emblem never re-downloads.
      ...[
        "/fastfoodfriendslogo.jpg",
        "/fastfoodfriendslogo-4k.jpg",
        "/fastfoodfriendslogo-cutout.png",
        "/fastfoodfriendslogo-48.png",
        "/fastfoodfriendslogo-96.png",
        "/fastfoodfriendslogo-144.png",
        "/fastfoodfriendslogo-192.png",
        "/fastfoodfriendslogo-v2-48.png",
        "/fastfoodfriendslogo-v2-96.png",
        "/fastfoodfriendslogo-v2-144.png",
        "/fastfoodfriendslogo-v2-192.png",
      ].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      })),
    ];
  },
};

export default nextConfig;
