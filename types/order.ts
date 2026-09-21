/**
 * Shared order contracts.
 *
 * This module is imported by **client components** (cart, checkout) *and* by the
 * Server Action, so it must stay free of server-only imports.
 *
 * Security note: the client only ever sends `{ itemId, variantId, modifierIds,
 * quantity }`. Every price is re-resolved from `lib/menu.ts` inside the Server
 * Action — the browser can never dictate what an order costs.
 */

export type OrderMode = "delivery" | "pickup";

/** What the browser sends for a single cart line (no prices!). */
export interface CartLineInput {
  itemId: string;
  variantId: string | null;
  modifierIds: string[];
  quantity: number;
}

export interface CartLine extends CartLineInput {
  /** Stable key built from item + variant + sorted modifiers. */
  key: string;
  /** Display fields cached for instant cart rendering (never trusted for price). */
  name: string;
  variantLabel: string | null;
  modifierLabels: string[];
  unitPriceCents: number;
}

/** A fully server-resolved order line (prices recomputed from the menu). */
export interface OrderLine {
  itemId: string;
  slug: string;
  name: string;
  variantLabel: string | null;
  modifierLabels: string[];
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderPricing {
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  itemCount: number;
}

export interface CustomerDetails {
  fullName: string;
  phoneRaw: string;
  phoneE164: string;
  address: string;
  notes: string;
}

export interface OrderReceipt {
  orderNumber: string;
  receivedAtIso: string;
  mode: OrderMode;
  lines: OrderLine[];
  pricing: OrderPricing;
  customer: CustomerDetails;
  /** Copy shown in the UI, e.g. `"25–40 min"`. */
  etaLabel: string;
}

/** Field-level validation errors keyed by form field name. */
export type OrderFieldErrors = Partial<
  Record<"fullName" | "phone" | "address" | "notes" | "items" | "mode", string>
>;

export interface OrderFormState {
  status: "idle" | "success" | "error";
  fieldErrors: OrderFieldErrors;
  /** Form-level error message (network, ntfy outage, …). */
  formError: string;
  orderNumber: string;
  totalCents: number;
  /** Whether the manager push notification was accepted by ntfy.sh. */
  notificationDelivered: boolean;
  /** Human explanation for the UI when the push failed. */
  notificationNote: string;
  /** Echoed back so the form is not wiped when validation fails. */
  values: {
    fullName: string;
    phone: string;
    address: string;
    notes: string;
    mode: OrderMode;
  };
}

export const INITIAL_ORDER_STATE: OrderFormState = {
  status: "idle",
  fieldErrors: {},
  formError: "",
  orderNumber: "",
  totalCents: 0,
  notificationDelivered: false,
  notificationNote: "",
  values: {
    fullName: "",
    phone: "",
    address: "",
    notes: "",
    mode: "delivery",
  },
};

/** Serialised cart payload field name inside the checkout `<form>`. */
export const CART_PAYLOAD_FIELD = "cartPayload";