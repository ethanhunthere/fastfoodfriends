/**
 * SEO layer: metadata builders + Schema.org JSON-LD graphs.
 *
 * Everything here is server-side and static so crawlers get complete markup in
 * the very first HTML response (no client-side JSON-LD injection).
 */
import type { Metadata, Viewport } from "next";
import { getOpeningHoursSpecification } from "./hours";
import { formatPriceMachine } from "./format";
import {
  getMenuSections,
  getItemsByCategory,
  getDefaultVariantId,
  resolveLine,
  itemHref,
  MENU_STATS,
  type MenuItem,
} from "./menu";
import { MAPS_URL, ORDER_CONFIG, RESTAURANT, getSiteUrl } from "./restaurant";

export const SITE_URL = getSiteUrl();

/** Placeholder imagery — swap for real 1200×630 photos of your own food. */
export const SOCIAL_IMAGE = "/opengraph-image";
export const LOGO_IMAGE = "/icon.svg";

export const DEFAULT_DESCRIPTION = `${RESTAURANT.name}: ${RESTAURANT.description} Gjeni në ${RESTAURANT.address.street}, ${RESTAURANT.address.city} — ${RESTAURANT.landmarks}. Porosit online, konfirmo me telefon, dorëzim brenda ${ORDER_CONFIG.radiusKm} km.`;

/** Root metadata (inherited by every route via `title.template`). */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${RESTAURANT.name} — Porosi Fast Food në ${RESTAURANT.address.city}`,
    template: `%s | ${RESTAURANT.name}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: RESTAURANT.name,
  keywords: [
    "fast food Pejë",
    "hamburger Pejë",
    "porosi hamburger Pejë",
    "hotdog Pejë",
    "tost Pejë",
    "pomfrit Pejë",
    "porosi ushqimi Pejë",
    "dërgim ushqim Pejë",
    RESTAURANT.address.street,
    "përballë Shkollës Teknike Pejë",
    "Shkolla Fillore Ramiz Sadiku Pejë",
    "porosi ushqimi Kosovë",
    RESTAURANT.name,
  ],
  authors: [{ name: RESTAURANT.name, url: SITE_URL }],
  creator: RESTAURANT.name,
  publisher: RESTAURANT.name,
  category: "restaurant",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "sq_AL",
    url: SITE_URL,
    siteName: RESTAURANT.name,
    title: `${RESTAURANT.name} — Porosi Fast Food në ${RESTAURANT.address.city}`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: `${RESTAURANT.name} — menu e hamburgerëve, hotdogëve dhe pomfritit`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${RESTAURANT.name} — Porosi Fast Food në ${RESTAURANT.address.city}`,
    description: DEFAULT_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: true, address: true },
  appleWebApp: {
    capable: true,
    title: RESTAURANT.shortName,
    statusBarStyle: "black-translucent",
  },
};

/** Viewport export (must live outside `metadata` since Next 15). */
export const rootViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
  ],
  colorScheme: "light",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  // Zoom stays enabled — blocking it hurts accessibility (WCAG 1.4.4).
};

interface PageMetadataInput {
  title: string;
  description: string;
  path: `/${string}` | "/";
  imageAlt?: string;
  noIndex?: boolean;
}

/** Per-route metadata with a self-referencing canonical URL. */
export function buildPageMetadata({
  title,
  description,
  path,
  imageAlt,
  noIndex = false,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${RESTAURANT.name}`,
      description,
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      images: [
        {
          url: SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: imageAlt ?? `${RESTAURANT.name} — ${title}`,
        },
      ],
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

/* ------------------------------------------------------------------ *
 *  Schema.org JSON-LD
 * ------------------------------------------------------------------ */

const POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: RESTAURANT.address.street,
  addressLocality: RESTAURANT.address.city,
  addressRegion: RESTAURANT.address.region,
  postalCode: RESTAURANT.address.postalCode,
  addressCountry: RESTAURANT.address.country,
} as const;

const GEO_COORDINATES = {
  "@type": "GeoCoordinates",
  latitude: RESTAURANT.geo.latitude,
  longitude: RESTAURANT.geo.longitude,
} as const;

/** A single `MenuItem` node, priced at its default configuration. */
function menuItemNode(item: MenuItem) {
  const variantId = getDefaultVariantId(item);
  const resolved = resolveLine(item, variantId, []);
  const price = resolved?.unitPriceCents ?? item.priceCents;

  return {
    "@type": "MenuItem",
    "@id": `${SITE_URL}${itemHref(item.slug)}#menuitem`,
    name: item.name,
    description: item.description,
    url: `${SITE_URL}${itemHref(item.slug)}`,
    image: `${SITE_URL}${SOCIAL_IMAGE}`,
    ...(item.vegetarianOption
      ? { suitableForDiet: "https://schema.org/VegetarianDiet" }
      : {}),
    ...(item.tags?.length ? { keywords: item.tags.join(", ") } : {}),
    offers: {
      "@type": "Offer",
      price: formatPriceMachine(price),
      priceCurrency: RESTAURANT.currency,
      availability: item.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}${itemHref(item.slug)}`,
    },
  };
}

/** `Menu` node with all sections and members (`hasMenuSection` → `hasMenuItem`). */
export function buildMenuJsonLd() {
  return {
    "@type": "Menu",
    "@id": `${SITE_URL}/#menu`,
    name: `Menuja e ${RESTAURANT.name}`,
    description: `Menuja e plotë e ${RESTAURANT.name} — ${MENU_STATS.itemCount} artikuj në ${MENU_STATS.categoryCount} kategori.`,
    url: `${SITE_URL}/#menu`,
    inLanguage: "sq",
    hasMenuSection: getMenuSections().map((section) => ({
      "@type": "MenuSection",
      "@id": `${SITE_URL}/#menu-${section.category.id}`,
      name: section.category.name,
      description: section.category.blurb,
      hasMenuItem: section.items.map(menuItemNode),
    })),
  };
}
/**
 * The restaurant itself: `FastFoodRestaurant` (a `LocalBusiness` subtype) with
 * opening hours, geo, delivery method and the order action.
 */
export function buildRestaurantJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FastFoodRestaurant",
    "@id": `${SITE_URL}/#restaurant`,
    name: RESTAURANT.name,
    legalName: RESTAURANT.legalName,
    alternateName: RESTAURANT.shortName,
    description: `${RESTAURANT.description} ${RESTAURANT.landmarks}, ${RESTAURANT.address.neighborhood}, ${RESTAURANT.address.city}.`,
    slogan: RESTAURANT.tagline,
    url: SITE_URL,
    telephone: RESTAURANT.phoneE164,
    email: RESTAURANT.email,
    image: [`${SITE_URL}${SOCIAL_IMAGE}`],
    logo: `${SITE_URL}${LOGO_IMAGE}`,
    priceRange: RESTAURANT.priceRange,
    currenciesAccepted: RESTAURANT.currency,
    paymentAccepted: "Cash, Credit Card, Debit Card",
    servesCuisine: [...RESTAURANT.servesCuisine],
    address: POSTAL_ADDRESS,
    geo: GEO_COORDINATES,
    hasMap: MAPS_URL,
    areaServed: { "@type": "City", name: RESTAURANT.address.city },
    openingHoursSpecification: getOpeningHoursSpecification(),
    hasDeliveryMethod: [
      "https://schema.org/OnSitePickup",
      "https://schema.org/ParcelService",
    ],
    acceptsReservations: false,
    publicAccess: true,
    smokingAllowed: false,
    hasMenu: buildMenuJsonLd(),
    potentialAction: {
      "@type": "OrderAction",
      name: "Porosit online",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/#menu`,
        inLanguage: "sq",
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
      deliveryMethod: "https://schema.org/ParcelService",
      priceSpecification: {
        "@type": "DeliveryChargeSpecification",
        price: formatPriceMachine(ORDER_CONFIG.deliveryFeeCents),
        priceCurrency: RESTAURANT.currency,
        eligibleTransactionVolume: {
          "@type": "PriceSpecification",
          minPrice: formatPriceMachine(ORDER_CONFIG.minimumOrderCents),
          priceCurrency: RESTAURANT.currency,
        },
      },
    },
    sameAs: [RESTAURANT.social.instagram, RESTAURANT.social.facebook].filter(Boolean),
  };
}

/** Item detail page: `MenuItem` node (+ add-ons), linked back into the menu graph. */
export function buildMenuItemJsonLd(item: MenuItem) {
  return {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    "@id": `${SITE_URL}${itemHref(item.slug)}#menuitem`,
    name: item.name,
    description: item.description,
    url: `${SITE_URL}${itemHref(item.slug)}`,
    image: `${SITE_URL}${SOCIAL_IMAGE}`,
    menuAddOn: (item.modifierGroups ?? []).flatMap((group) =>
      group.options.map((option) => ({
        "@type": "MenuItem",
        name: option.label,
        ...(option.priceDeltaCents > 0
          ? {
              offers: {
                "@type": "Offer",
                price: formatPriceMachine(option.priceDeltaCents),
                priceCurrency: RESTAURANT.currency,
              },
            }
          : {}),
      })),
    ),
    ...(item.vegetarianOption
      ? { suitableForDiet: "https://schema.org/VegetarianDiet" }
      : {}),
    ...(item.allergens?.length
      ? {
          allergens: item.allergens.map((allergen) => ({
            "@type": "Thing",
            name: allergen,
          })),
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: formatPriceMachine(item.priceCents),
      priceCurrency: RESTAURANT.currency,
      availability: item.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}${itemHref(item.slug)}`,
    },
    isPartOf: { "@id": `${SITE_URL}/#menu` },
    provider: { "@id": `${SITE_URL}/#restaurant` },
  };
}

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

export function buildBreadcrumbJsonLd(entries: readonly BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: `${SITE_URL}${entry.path === "/" ? "" : entry.path}`,
    })),
  };
}

/** `WebSite` node — helps search engines understand the site entity. */
export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: RESTAURANT.name,
    inLanguage: "sq",
    publisher: { "@id": `${SITE_URL}/#restaurant` },
  };
}

/** Item URLs for `sitemap.ts` (kept here so SEO data has one source of truth). */
export function getSitemapEntries() {
  const staticRoutes = ["/", "/menu", "/kontakt"] as const;
  const itemRoutes = getMenuSections().flatMap((section) =>
    section.items.map((item) => itemHref(item.slug)),
  );
  return [...staticRoutes, ...itemRoutes];
}

/** Convenience: all items of one category. */
export function getCategoryItems(category: Parameters<typeof getItemsByCategory>[0]) {
  return getItemsByCategory(category);
}