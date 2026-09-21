import {
  getAvailableItems,
  getDefaultVariantId,
  getItemById,
  resolveLine,
  type MenuItem,
  type CategoryId,
} from "./menu";
import { buildLineKey } from "./cart";
import type { CartLineInput } from "../types/order";

/**
 * Cross-sell taxonomy — menu categories map to three merchandising slots:
 *   food  → hamburgers, hotdog, tost            (ushqime-kryesore)
 *   drink → coca-cola, fanta, ujë, jogurt, ajran (pije)
 *   side  → pomfrit                              (shtesa)
 * The engine reasons about which slots the basket covers — not about specific
 * items — so adding a menu item never requires changes here.
 */
export type UpsellSlot = "food" | "drink" | "side";

const SLOT_BY_CATEGORY: Record<CategoryId, UpsellSlot> = {
  "ushqime-kryesore": "food",
  pije: "drink",
  shtesa: "side",
};

export type UpsellGroupKind = "drink" | "eat" | "side";

/** Cashier-style prompts, one per recommendation group. */
const GROUP_HEADERS: Record<UpsellGroupKind, string> = {
  drink: "Përzgjidh një pije të ftohtë",
  eat: "Shto diçka për të ngrënë",
  side: "Diçka për të përcjellë",
};

/** Which slots each group draws its suggestions from. */
const GROUP_SLOTS: Record<UpsellGroupKind, readonly UpsellSlot[]> = {
  drink: ["drink"],
  eat: ["food", "side"],
  side: ["side"],
};

export interface UpsellSuggestion {
  item: MenuItem;
  input: CartLineInput;
  key: string;
  display: {
    name: string;
    variantLabel: string | null;
    modifierLabels: string[];
    unitPriceCents: number;
  };
}

export interface UpsellGroup {
  kind: UpsellGroupKind;
  header: string;
  suggestions: UpsellSuggestion[];
}

function buildSuggestion(item: MenuItem): UpsellSuggestion | null {
  const variantId = getDefaultVariantId(item);
  const resolved = resolveLine(item, variantId, []);
  if (!resolved) return null;
  return {
    item,
    input: { itemId: item.id, variantId, modifierIds: [], quantity: 1 } satisfies CartLineInput,
    key: buildLineKey(item.id, variantId, []),
    display: {
      name: resolved.name,
      variantLabel: resolved.variant?.label ?? null,
      modifierLabels: [],
      unitPriceCents: resolved.unitPriceCents,
    },
  };
}

function makeGroup(kind: UpsellGroupKind, cartItemIds: ReadonlySet<string>): UpsellGroup {
  const slots = new Set<string>(GROUP_SLOTS[kind]);
  return {
    kind,
    header: GROUP_HEADERS[kind],
    suggestions: getAvailableItems()
      .filter(
        (item) =>
          slots.has(SLOT_BY_CATEGORY[item.category] ?? "") &&
          !cartItemIds.has(item.id),
      )
      .map(buildSuggestion)
      .filter((suggestion): suggestion is UpsellSuggestion => suggestion !== null),
  };
}

/**
 * Route recommendations from the live basket. Evaluated whenever checkout is
 * triggered (the host component mounts on open), so suggestions always
 * reflect what the customer actually has.
 *
 *   food only         → drinks first, then a side
 *   drinks only       → mains + a side ("something to eat")
 *   food + drink      → a side, unless the meal is complete → skip entirely
 *   nothing/malformed → no recommendations; checkout opens directly
 */
export function getUpsellGroups(
  lines: readonly Pick<CartLineInput, "itemId">[],
): UpsellGroup[] {
  if (!lines.length) return [];

  const cartItemIds = new Set<string>();
  const slots = new Set<UpsellSlot>();
  for (const line of lines) {
    const item = getItemById(line.itemId);
    if (!item) continue;
    cartItemIds.add(item.id);
    const slot = SLOT_BY_CATEGORY[item.category];
    if (slot) slots.add(slot);
  }
  if (!slots.size) return [];

  const hasFood = slots.has("food");
  const hasDrink = slots.has("drink");
  const hasSide = slots.has("side");

  const groups: UpsellGroup[] = [];
  if (!hasDrink) groups.push(makeGroup("drink", cartItemIds));
  if (!hasFood) groups.push(makeGroup("eat", cartItemIds));
  if (!hasSide && hasFood) groups.push(makeGroup("side", cartItemIds));

  return groups.filter((group) => group.suggestions.length > 0);
}
