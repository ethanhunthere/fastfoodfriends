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
        source: "/menu/v2/:path*",
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
    ];
  },
};

export default nextConfig;
