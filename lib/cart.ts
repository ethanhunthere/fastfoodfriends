/**
 * Cart helpers — pure and client-safe.
 *
 * `lib/cart.ts` decides *what* a line is; `lib/menu.ts` decides what it *costs*.
 * The Server Action re-runs both on the server, so nothing here is trusted.
 */
import { ORDER_CONFIG } from "./restaurant";
import type {
  CartLine,
  CartLineInput,
  OrderMode,
  OrderPricing,
} from "../types/order";

/** Display fields the client caches for instant rendering (never used for pricing). */
export interface CartLineDisplay {
  name: string;
  variantLabel: string | null;
  modifierLabels: string[];
  unitPriceCents: number;
}

/**
 * Stable identity for a cart line: item + variant + sorted modifiers.
 * Sorting makes `[pa-qepe, keqap]` and `[keqap, pa-qepe]` the same line, so
 * tapping the same customisation twice increments instead of duplicating.
 */
export function buildLineKey(
  itemId: string,
  variantId: string | null,
  modifierIds: readonly string[],
): string {
  const modifiers = [...new Set(modifierIds)].sort().join("+");
  return [itemId, variantId ?? "-", modifiers || "plain"].join("::");
}

export function createCartLine(
  input: CartLineInput,
  display: CartLineDisplay,
): CartLine {
  return {
    ...input,
    key: buildLineKey(input.itemId, input.variantId, input.modifierIds),
    name: display.name,
    variantLabel: display.variantLabel,
    modifierLabels: display.modifierLabels,
    unitPriceCents: display.unitPriceCents,
  };
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(
    ORDER_CONFIG.maxQuantityPerLine,
    Math.max(1, Math.trunc(quantity)),
  );
}

/** Delivery fee after the free-delivery threshold. */
export function resolveDeliveryFee(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  if (subtotalCents >= ORDER_CONFIG.freeDeliveryThresholdCents) return 0;
  return ORDER_CONFIG.deliveryFeeCents;
}

export function calculateTotals(
  lines: readonly Pick<CartLine, "unitPriceCents" | "quantity">[],
  mode: OrderMode = "delivery",
): OrderPricing {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const deliveryFeeCents = mode === "delivery" ? resolveDeliveryFee(subtotalCents) : 0;

  return {
    subtotalCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
    itemCount,
  };
}

/** Serialise only the fields the server needs — prices are recomputed server-side. */
export function serialiseCartPayload(lines: readonly CartLine[]): string {
  const payload: CartLineInput[] = lines.map((line) => ({
    itemId: line.itemId,
    variantId: line.variantId,
    modifierIds: line.modifierIds,
    quantity: line.quantity,
  }));
  return JSON.stringify(payload);
}

/**
 * Parse a cart payload coming from the browser. Structural validation only —
 * price/availability validation happens against `lib/menu.ts` in the action.
 */
export function parseCartPayload(raw: unknown): CartLineInput[] {
  if (typeof raw !== "string" || raw.trim().length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const lines: CartLineInput[] = [];

  for (const candidate of parsed.slice(0, ORDER_CONFIG.maxLinesPerOrder)) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const record = candidate as Record<string, unknown>;

    const itemId = typeof record.itemId === "string" ? record.itemId : "";
    if (!itemId) continue;

    const variantId =
      typeof record.variantId === "string" && record.variantId.length > 0
        ? record.variantId
        : null;

    const modifierIds = Array.isArray(record.modifierIds)
      ? record.modifierIds.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
      : [];

    const quantity = clampQuantity(
      typeof record.quantity === "number" ? record.quantity : Number(record.quantity),
    );

    lines.push({ itemId, variantId, modifierIds, quantity });
  }

  return lines;
}

/** Human label for a line, e.g. `Hamburger Tradicional (Me ve)`. */
export function describeCartLine(line: {
  name: string;
  variantLabel: string | null;
  modifierLabels: string[];
}): string {
  const variant = line.variantLabel ? ` (${line.variantLabel})` : "";
  const modifiers = line.modifierLabels.length
    ? ` — ${line.modifierLabels.join(", ")}`
    : "";
  return `${line.name}${variant}${modifiers}`;
}

export const CART_STORAGE_KEY = "fff.cart.v2";