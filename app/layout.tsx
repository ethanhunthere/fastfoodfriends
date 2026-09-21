import "@/app/globals.css";
import "@/app/express.css";
import "@/app/express-interactions.css";
import "@/app/responsive.css";
import "@/app/upsell.css";
import "@/app/upsell-short.css";
import "@/app/stepper.css";

import type { ReactNode } from "react";
import { Inter, Outfit } from "next/font/google";
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["500", "600", "700"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sq-AL" className={`${inter.variable} ${outfit.variable}`}>
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
