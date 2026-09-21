import "@/app/globals.css";
import "@/app/express.css";
import "@/app/express-interactions.css";
import "@/app/responsive.css";
import "@/app/upsell.css";
import "@/app/upsell-short.css";
import "@/app/stepper.css";

import type { ReactNode } from "react";
import { Rokkitt } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { SkipLink } from "@/components/SkipLink";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLdGraph } from "@/components/JsonLd";
import { CartProvider } from "@/components/CartProvider";
import { StickyOrderBar } from "@/components/StickyOrderBar";
import { CartSheet } from "@/components/CartSheet";
import { CheckoutModal } from "@/components/CheckoutModal";
import {
  buildRestaurantJsonLd,
  buildWebSiteJsonLd,
  rootMetadata,
  rootViewport,
} from "@/lib/seo";

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

/* ── Brand voice: Rokkitt ───────────────────────────────────────────────────
   One family, the whole application. A condensed vintage slab — the letterpress
   menu-board voice. Variable weights 100–900; every heading, price, button,
   modal and label renders it. Serif system fallbacks only: the brand never
   falls back to a generic grotesque. */
const rokkitt = Rokkitt({
  subsets: ["latin"],
  variable: "--font-rokkitt",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sq-AL" className={rokkitt.variable}>
      <body className="flex min-h-dvh flex-col bg-charcoal-950 text-cream-100 antialiased">
        {/* JSON-LD lives first in the body so crawlers index it instantly. */}
        <JsonLdGraph
          graphs={[buildWebSiteJsonLd(), buildRestaurantJsonLd()]}
        />

        <CartProvider>
          <div id="storefront-shell">
          <SkipLink />
          <Header />
          <main id="permbajtja" className="storefront-container flex-1">
            {children}
          </main>
          <Footer />
          <StickyOrderBar />
          </div>
          <CartSheet />
          <CheckoutModal />
        </CartProvider>
      </body>
    </html>
  );
}
