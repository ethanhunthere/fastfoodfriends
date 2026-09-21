/**
 * Single source of truth for the business — public, client-safe values only
 * (no secrets here, this module is imported by client components too).
 */
import { telHref } from "./phone";

export const RESTAURANT = {
  name: process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? "Fast Food Friends",
  legalName: process.env.NEXT_PUBLIC_RESTAURANT_NAME ?? "Fast Food Friends",
  shortName: "FF Friends",
  tagline: "Hamburger, hotdog, tost & pomfrit — zgjidh, personalizo dhe porosit online.",
  description:
    "Fast Food Friends — hamburger tradicional me ose pa ve, hamburger me mish pule, me qyfte, hotdog, tost, pomfrit dhe pije të ftohta. Porosit online dhe konfirmo me një telefonatë.",
  phoneE164: process.env.NEXT_PUBLIC_RESTAURANT_PHONE ?? "+38344123456",
  email: process.env.NEXT_PUBLIC_RESTAURANT_EMAIL ?? "porosi@fastfoodfriends.example",
  address: {
    street: process.env.NEXT_PUBLIC_RESTAURANT_STREET ?? "Rruga Vëllezërit Gërvalla",
    city: process.env.NEXT_PUBLIC_RESTAURANT_CITY ?? "Pejë",
    region: "Pejë",
    postalCode: "30000",
    country: "XK",
    countryName: "Kosovë",
    neighborhood: "Lagjja Rrokaqielli",
  },
  /** How locals actually describe the spot — used in copy and JSON-LD. */
  landmarks:
    'Përballë Shkollës Teknike dhe Shkollës Fillore "Ramiz Sadiku"',
  landmarkShort: "Përballë Shkollës Teknike",
  geo: {
    latitude: Number(process.env.NEXT_PUBLIC_RESTAURANT_LAT ?? "42.6629"),
    longitude: Number(process.env.NEXT_PUBLIC_RESTAURANT_LNG ?? "20.3016"),
  },
  priceRange: "€€",
  currency: "EUR",
  servesCuisine: ["Fast Food", "Burgers", "Hot Dogs", "American"],
  social: {
    instagram: process.env.NEXT_PUBLIC_RESTAURANT_INSTAGRAM ?? "",
    facebook: process.env.NEXT_PUBLIC_RESTAURANT_FACEBOOK ?? "",
  },
} as const;

/** Order/delivery rules — mirrored in the Server Action so the client can never fake a total. */
export const ORDER_CONFIG = {
  /** Delivery fee in cents (free above the threshold below). */
  deliveryFeeCents: 100,
  /** Orders at or above this value get free delivery. */
  freeDeliveryThresholdCents: 1500,
  /** Minimum cart value for delivery orders. */
  minimumOrderCents: 500,
  /** Delivery radius used in copy + structured data. */
  radiusKm: 5,
  etaMinutes: { min: 25, max: 40 },
  /** Hard limits to keep notifications readable and abuse bounded. */
  maxQuantityPerLine: 20,
  maxLinesPerOrder: 30,
  maxNotesLength: 400,
  maxAddressLength: 160,
  maxNameLength: 60,
  /** When closed we still accept pre-orders but tell the customer. */
  acceptOrdersWhenClosed: true,
} as const;

export const DELIVERY_AREAS = [
  "Qendër",
  "Lagjja Rrokaqielli",
  "Kapeshnica",
  "Kryshec",
  "Karagaç",
  "Pejë e Epërme",
  "Bërzhenica",
  "Zllakuqan",
] as const;

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getRestaurantPhoneHref(): string {
  return telHref(RESTAURANT.phoneE164);
}

/** Full one-line address, used in copy, notifications and structured data. */
export function getFormattedAddress(): string {
  const { street, postalCode, city, countryName } = RESTAURANT.address;
  return `${street}, ${postalCode} ${city}, ${countryName}`;
}

/** Official Google Maps place link (shared as "Hape në Maps" everywhere). */
export const MAPS_URL =
  process.env.NEXT_PUBLIC_RESTAURANT_MAPS_URL ??
  "https://maps.app.goo.gl/z4141tV2CXvRX4Up7?g_st=ic";

/** Google Maps deep link (no API key needed). */
export function getDirectionsUrl(): string {
  const query = encodeURIComponent(
    `${RESTAURANT.name}, ${getFormattedAddress()}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Opening hours.
 *
 * Weekday index follows `Date.getUTCDay()`: 0 = Sunday … 6 = Saturday.
 * A `close` value **earlier than or equal to** `open` means the shift runs past
 * midnight (e.g. Friday 09:00 → 01:00 closes on Saturday at 01:00).
 */
export interface DayHours {
  open: string;
  close: string;
}

export type WeeklySchedule = Partial<Record<number, readonly DayHours[]>>;

export const WEEKLY_SCHEDULE: WeeklySchedule = {
  0: [{ open: "10:00", close: "23:00" }], // E diel
  1: [{ open: "09:00", close: "23:00" }], // E hënë
  2: [{ open: "09:00", close: "23:00" }], // E martë
  3: [{ open: "09:00", close: "23:00" }], // E mërkurë
  4: [{ open: "09:00", close: "23:00" }], // E enjte
  5: [{ open: "09:00", close: "01:00" }], // E premte (mbyllet të shtunën 01:00)
  6: [{ open: "09:00", close: "01:00" }], // E shtunë (mbyllet të dielën 01:00)
};

/** IANA timezone for the store (Kosovo = Europe/Belgrade). */
export const STORE_TIMEZONE = process.env.RESTAURANT_TIMEZONE ?? "Europe/Belgrade";

/**
 * Revalidation window for the (otherwise fully static) menu + hours badge.
 * 300s keeps the "Hapur Tani" badge accurate to within 5 minutes while the page
 * is still served from the CDN edge with zero client JS. Set
 * `export const dynamic = "force-dynamic"` in `app/page.tsx` for per-request
 * accuracy at the cost of losing static caching.
 */
export const HOURS_REVALIDATE_SECONDS = 300;