/**
 * Menu — the authoritative data source.
 *
 * Every price lives here in **integer cents**. The browser receives a serialised
 * copy for rendering, but the Server Action re-resolves every line against this
 * module, so the client can never tamper with the total.
 */

export type CategoryId = "ushqime-kryesore" | "shtesa" | "pije";

/** Icon keys mapped to lucide-react components in the UI layer. */
export type CategoryIcon = "beef" | "salad" | "cup-soda";

export interface MenuCategory {
  id: CategoryId;
  name: string;
  blurb: string;
  icon: CategoryIcon;
}

export interface MenuModifier {
  id: string;
  label: string;
  priceDeltaCents: number;
}

export interface ModifierGroup {
  id: string;
  label: string;
  helpText: string;
  /** `1` renders radio buttons, `undefined` renders checkboxes. */
  maxSelections?: number;
  options: MenuModifier[];
}

export interface ItemVariant {
  id: string;
  label: string;
  priceDeltaCents: number;
  isDefault?: boolean;
}

export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  description: string;
  /** Base price in cents (before variant / modifier deltas). */
  priceCents: number;
  variants?: ItemVariant[];
  modifierGroups?: ModifierGroup[];
  /** Short marketing badges, e.g. `"Popullor"`. */
  tags?: string[];
  allergens?: string[];
  vegetarianOption?: boolean;
  available: boolean;
  featured?: boolean;
  /** Approximate preparation time in minutes (used in schema + UI). */
  prepMinutes: number;
}

export const MENU_CATEGORIES: readonly MenuCategory[] = [
  {
    id: "ushqime-kryesore",
    name: "Ushqime Kryesore",
    blurb: "Hamburger, hotdog dhe tost — të përgatitura në momentin e porosisë.",
    icon: "beef",
  },
  {
    id: "shtesa",
    name: "Shtesa",
    blurb: "Pomfrit e krokant, të skuqura në vaj të freskët.",
    icon: "salad",
  },
  {
    id: "pije",
    name: "Pije",
    blurb: "Pije të ftohta, ujë, jogurt dhe ajran.",
    icon: "cup-soda",
  },
] as const;

/* ------------------------------------------------------------------ *
 *  Reusable modifier groups
 * ------------------------------------------------------------------ */

/** Full sandwich topping list — the classic Kosovo "pa qepë / ekstra majonez" set. */
const SANDWICH_GROUP: ModifierGroup = {
  id: "perberesit",
  label: "Përbërësit",
  helpText: "Zgjidh çka do të heqësh ose shtosh. Mund të zgjedhësh disa.",
  options: [
    { id: "pa-qepe", label: "Pa qepë", priceDeltaCents: 0 },
    { id: "pa-domate", label: "Pa domate", priceDeltaCents: 0 },
    { id: "pa-sallate", label: "Pa sallatë", priceDeltaCents: 0 },
    { id: "sallate-ekstra", label: "Sallatë ekstra", priceDeltaCents: 30 },
    { id: "ekstra-majonez", label: "Ekstra majonez", priceDeltaCents: 20 },
    { id: "keqap", label: "Keçap", priceDeltaCents: 20 },
    { id: "ekstra-djath", label: "Ekstra djath", priceDeltaCents: 50 },
    { id: "pikante", label: "Pikante (salcë e nxehtë)", priceDeltaCents: 20 },
  ],
};

const GRILL_GROUP: ModifierGroup = {
  id: "perberesit",
  label: "Përbërësit",
  helpText: "Shto ose hiq përbërës sipas dëshirës.",
  options: [
    { id: "pa-qepe", label: "Pa qepë", priceDeltaCents: 0 },
    { id: "pa-sallate", label: "Pa sallatë", priceDeltaCents: 0 },
    { id: "ekstra-majonez", label: "Ekstra majonez", priceDeltaCents: 20 },
    { id: "keqap", label: "Keçap", priceDeltaCents: 20 },
    { id: "ekstra-ketchup-speciale", label: "Salcë speciale e shtëpisë", priceDeltaCents: 30 },
    { id: "pikante", label: "Pikante", priceDeltaCents: 20 },
  ],
};

const TOST_GROUP: ModifierGroup = {
  id: "perberesit",
  label: "Përbërësit",
  helpText: "Personalizo tostin.",
  options: [
    { id: "pa-gjalpe", label: "Pa gjalpë", priceDeltaCents: 0 },
    { id: "ekstra-djath", label: "Ekstra djath", priceDeltaCents: 50 },
    { id: "keqap", label: "Keçap", priceDeltaCents: 20 },
    { id: "ekstra-majonez", label: "Ekstra majonez", priceDeltaCents: 20 },
    { id: "pa-domate", label: "Pa domate", priceDeltaCents: 0 },
  ],
};

const FRIES_GROUP: ModifierGroup = {
  id: "shtesat",
  label: "Shtesa për pomfrit",
  helpText: "Bëj pomfritin si e do ti.",
  options: [
    { id: "pa-krip", label: "Pa krip", priceDeltaCents: 0 },
    { id: "ekstra-majonez", label: "Ekstra majonez", priceDeltaCents: 20 },
    { id: "keqap", label: "Keçap", priceDeltaCents: 20 },
    { id: "djath-i-shkrire", label: "Djath i shkrirë", priceDeltaCents: 50 },
    { id: "pikante", label: "Pluhur pikant", priceDeltaCents: 0 },
  ],
};

const SODA_GROUP: ModifierGroup = {
  id: "sherbimi",
  label: "Shërbimi",
  helpText: "Zgjidh temperaturën / akullin.",
  maxSelections: 1,
  options: [
    { id: "pa-akull", label: "Pa akull", priceDeltaCents: 0 },
    { id: "me-akull", label: "Me akull", priceDeltaCents: 0 },
    { id: "i-ftohte", label: "I ftohtë", priceDeltaCents: 0 },
  ],
};

const WATER_GROUP: ModifierGroup = {
  id: "sherbimi",
  label: "Shërbimi",
  helpText: "Zgjidh temperaturën.",
  maxSelections: 1,
  options: [
    { id: "i-ftohte", label: "I ftohtë", priceDeltaCents: 0 },
    { id: "i-vaket", label: "I vakët (temperaturë dhome)", priceDeltaCents: 0 },
  ],
};

const DAIRY_GROUP: ModifierGroup = {
  id: "sherbimi",
  label: "Shërbimi",
  helpText: "Zgjidh stilin e servimit.",
  maxSelections: 1,
  options: [
    { id: "i-ftohte", label: "I ftohtë", priceDeltaCents: 0 },
    { id: "pa-akull", label: "Pa akull", priceDeltaCents: 0 },
    { id: "me-krip", label: "Me krip (ajran tradicional)", priceDeltaCents: 0 },
  ],
};

/* ------------------------------------------------------------------ *
 *  Menu items
 * ------------------------------------------------------------------ */

export const MENU_ITEMS: readonly MenuItem[] = [
  {
    id: "hamburger-tradicional",
    slug: "hamburger-tradicional",
    name: "Hamburger Tradicional",
    category: "ushqime-kryesore",
    description:
      "Mish i bluar i freskët i pjekur në zgara, bukë e butë e ngrohur, sallatë, domate, qepë dhe salcë e shtëpisë. Zgjedh me ve ose pa ve.",
    priceCents: 250,
    variants: [
      { id: "me-ve", label: "Me ve", priceDeltaCents: 50 },
      { id: "pa-ve", label: "Pa ve", priceDeltaCents: 0, isDefault: true },
    ],
    modifierGroups: [SANDWICH_GROUP],
    tags: ["Popullor"],
    allergens: ["Gluten", "Ve", "Mustardë"],
    vegetarianOption: true,
    available: true,
    featured: true,
    prepMinutes: 8,
  },
  {
    id: "hamburger-mish-pule",
    slug: "hamburger-mish-pule",
    name: "Hamburger me Mish Pule",
    category: "ushqime-kryesore",
    description:
      "File i marinuar mishi pule, i pjekur derisa të jetë krokant nga jashtë e i butë brenda, me sallatë, domate dhe majonez.",
    priceCents: 300,
    modifierGroups: [SANDWICH_GROUP],
    tags: ["I ri"],
    allergens: ["Gluten", "Ve", "Mustardë"],
    available: true,
    featured: true,
    prepMinutes: 9,
  },
  {
    id: "hamburger-me-qyfte",
    slug: "hamburger-me-qyfte",
    name: "Hamburger me Qyfte",
    category: "ushqime-kryesore",
    description:
      "Qyfte tradicional i pjekur në zgara, me qepë, domate, sallatë dhe salcë pikante — shija e vërtetë e rrugës.",
    priceCents: 320,
    modifierGroups: [GRILL_GROUP],
    tags: ["Specialiteti"],
    allergens: ["Gluten", "Mustardë"],
    available: true,
    featured: true,
    prepMinutes: 10,
  },
  {
    id: "hotdog",
    slug: "hotdog",
    name: "Hotdog",
    category: "ushqime-kryesore",
    description:
      "Suxhuk i pjekur në bukë hotdog, me keçap, majonez dhe qepë krokante sipas dëshirës.",
    priceCents: 200,
    modifierGroups: [GRILL_GROUP],
    allergens: ["Gluten", "Ve", "Mustardë"],
    available: true,
    prepMinutes: 6,
  },
  {
    id: "tost",
    slug: "tost",
    name: "Tost",
    category: "ushqime-kryesore",
    description:
      "Tost i ngrohtë me djath të shkrirë, proshutë dhe domate, i shtypur në bukë të thekur.",
    priceCents: 220,
    modifierGroups: [TOST_GROUP],
    allergens: ["Gluten", "Ve", "Qumësht"],
    available: true,
    prepMinutes: 7,
  },
  {
    id: "pomfrit",
    slug: "pomfrit",
    name: "Pomfrit",
    category: "shtesa",
    description:
      "Pomfrit i prerë trashë, i skuqur në vaj të freskët dhe i kripur sapo del nga friteza.",
    priceCents: 150,
    variants: [
      { id: "mesatar", label: "Mesatar", priceDeltaCents: 0, isDefault: true },
      { id: "i-madh", label: "I madh", priceDeltaCents: 80 },
    ],
    modifierGroups: [FRIES_GROUP],
    tags: ["Popullor"],
    allergens: [],
    vegetarianOption: true,
    available: true,
    featured: true,
    prepMinutes: 5,
  },
  {
    id: "coca-cola",
    slug: "coca-cola",
    name: "Coca-Cola",
    category: "pije",
    description: "Coca-Cola e ftohtë, në shishe qelqi ose plastikë.",
    priceCents: 120,
    variants: [
      { id: "330ml", label: "330 ml", priceDeltaCents: 0, isDefault: true },
      { id: "500ml", label: "500 ml", priceDeltaCents: 60 },
      { id: "1l", label: "1 L", priceDeltaCents: 130 },
    ],
    modifierGroups: [SODA_GROUP],
    available: true,
    prepMinutes: 1,
  },
  {
    id: "fanta",
    slug: "fanta",
    name: "Fanta",
    category: "pije",
    description: "Fanta portokall e ftohtë, e gazuar.",
    priceCents: 120,
    variants: [
      { id: "330ml", label: "330 ml", priceDeltaCents: 0, isDefault: true },
      { id: "500ml", label: "500 ml", priceDeltaCents: 60 },
      { id: "1l", label: "1 L", priceDeltaCents: 130 },
    ],
    modifierGroups: [SODA_GROUP],
    available: true,
    prepMinutes: 1,
  },
  {
    id: "uje-natyral",
    slug: "uje-natyral",
    name: "Ujë Natyral",
    category: "pije",
    description: "Ujë mineral natyral pa gaz.",
    priceCents: 80,
    variants: [
      { id: "500ml", label: "500 ml", priceDeltaCents: 0, isDefault: true },
      { id: "1l", label: "1 L", priceDeltaCents: 70 },
    ],
    modifierGroups: [WATER_GROUP],
    available: true,
    prepMinutes: 1,
  },
  {
    id: "jogurt",
    slug: "jogurt",
    name: "Jogurt",
    category: "pije",
    description: "Jogurt i freskët, i servuar i ftohtë — shoqëruesi klasik i hamburgerit.",
    priceCents: 90,
    modifierGroups: [DAIRY_GROUP],
    allergens: ["Qumësht"],
    vegetarianOption: true,
    available: true,
    prepMinutes: 1,
  },
  {
    id: "ajran",
    slug: "ajran",
    name: "Ajran",
    category: "pije",
    description: "Pije tradicionale e jogurtit me kripë, e ftohtë dhe oshtuese.",
    priceCents: 100,
    modifierGroups: [DAIRY_GROUP],
    allergens: ["Qumësht"],
    vegetarianOption: true,
    available: true,
    prepMinutes: 1,
  },
];
/* ------------------------------------------------------------------ *
 *  Lookups
 * ------------------------------------------------------------------ */

const ITEMS_BY_ID = new Map<string, MenuItem>(
  MENU_ITEMS.map((item) => [item.id, item] as const),
);
const ITEMS_BY_SLUG = new Map<string, MenuItem>(
  MENU_ITEMS.map((item) => [item.slug, item] as const),
);

export function getItemById(id: string): MenuItem | undefined {
  return ITEMS_BY_ID.get(id);
}

export function getItemBySlug(slug: string): MenuItem | undefined {
  return ITEMS_BY_SLUG.get(slug);
}

export function getItemsByCategory(category: CategoryId): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.category === category);
}

export function getAvailableItems(): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.available);
}

export interface MenuSection {
  category: MenuCategory;
  items: MenuItem[];
}

export function getMenuSections(): MenuSection[] {
  return MENU_CATEGORIES.map((category) => ({
    category,
    items: getAvailableItems().filter((item) => item.category === category.id),
  }));
}

export function getFeaturedItems(limit = 3): MenuItem[] {
  return getAvailableItems()
    .filter((item) => item.featured)
    .slice(0, limit);
}

export function itemHref(slug: string): string {
  return `/menu/${slug}`;
}

/* ------------------------------------------------------------------ *
 *  Variants + modifiers
 * ------------------------------------------------------------------ */

export function getDefaultVariantId(item: MenuItem): string | null {
  if (!item.variants || item.variants.length === 0) return null;
  return (item.variants.find((variant) => variant.isDefault) ?? item.variants[0]).id;
}

export function findVariant(item: MenuItem, variantId: string | null | undefined): ItemVariant | null {
  if (!item.variants || item.variants.length === 0) return null;
  if (!variantId) return item.variants.find((variant) => variant.isDefault) ?? item.variants[0];
  return item.variants.find((variant) => variant.id === variantId) ?? null;
}

export function findModifier(item: MenuItem, modifierId: string): MenuModifier | undefined {
  for (const group of item.modifierGroups ?? []) {
    const match = group.options.find((option) => option.id === modifierId);
    if (match) return match;
  }
  return undefined;
}

/**
 * The single place where an order line's price is computed.
 * Unknown variant/modifier ids are **ignored** (never trusted), duplicates are
 * collapsed and group `maxSelections` is enforced.
 */
export interface ResolvedLine {
  itemId: string;
  slug: string;
  name: string;
  variant: ItemVariant | null;
  modifiers: MenuModifier[];
  unitPriceCents: number;
}

export function resolveLine(
  item: MenuItem,
  variantId: string | null | undefined,
  modifierIds: readonly string[],
): ResolvedLine | null {
  if (!item.available) return null;

  const variant = findVariant(item, variantId);
  if (item.variants?.length && !variant) return null;

  const seen = new Set<string>();
  const modifiers: MenuModifier[] = [];
  const perGroupCount = new Map<string, number>();

  for (const group of item.modifierGroups ?? []) {
    for (const optionId of modifierIds) {
      if (seen.has(optionId)) continue;
      const option = group.options.find((candidate) => candidate.id === optionId);
      if (!option) continue;

      const used = perGroupCount.get(group.id) ?? 0;
      if (group.maxSelections !== undefined && used >= group.maxSelections) {
        continue; // group is full, ignore extra selections
      }

      seen.add(optionId);
      perGroupCount.set(group.id, used + 1);
      modifiers.push(option);
    }
  }

  const unitPriceCents =
    item.priceCents +
    (variant?.priceDeltaCents ?? 0) +
    modifiers.reduce((sum, modifier) => sum + modifier.priceDeltaCents, 0);

  return {
    itemId: item.id,
    slug: item.slug,
    name: item.name,
    variant:
      variant && item.variants && item.variants.length > 1 ? variant : null,
    modifiers,
    unitPriceCents,
  };
}

/** `"nga 2,50 €"` when variants/modifiers can raise the price, else the exact price. */
export function priceRangeLabel(item: MenuItem): { from: number; to: number } {
  const variantDelta = Math.max(
    0,
    ...(item.variants ?? [{ priceDeltaCents: 0, id: "", label: "" }]).map(
      (variant) => variant.priceDeltaCents,
    ),
  );
  const modifierDelta = (item.modifierGroups ?? []).reduce(
    (sum, group) =>
      sum +
      group.options
        .filter((option) => option.priceDeltaCents > 0)
        .reduce((max, option) => Math.max(max, option.priceDeltaCents), 0),
    0,
  );
  return { from: item.priceCents, to: item.priceCents + variantDelta + modifierDelta };
}

/** Simple client-side-free search used by `/menu` JSON + tests. */
export function searchMenu(query: string): MenuItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return getAvailableItems();
  return getAvailableItems().filter((item) =>
    [item.name, item.description, ...(item.tags ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

export const MENU_STATS = {
  itemCount: getAvailableItems().length,
  categoryCount: MENU_CATEGORIES.length,
} as const;

/**
 * Visual emoji for an item — CLS-free, zero-request fallback artwork, used only
 * when an item has no photo in `MENU_IMAGES`. Pair with `itemImageAlt`.
 */
export function itemEmoji(item: MenuItem): string {
  const map: Record<string, string> = {
    "hamburger-tradicional": "🍔",
    "hamburger-mish-pule": "🍗",
    "hamburger-me-qyfte": "🔥",
    hotdog: "🌭",
    tost: "🥪",
    pomfrit: "🍟",
    "coca-cola": "🥤",
    fanta: "🥤",
    "uje-natyral": "💧",
    jogurt: "🥣",
    ajran: "🧋",
  };
  return map[item.id] ?? "🍽️";
}

/** Alt text for the icon stand-in (kept here so it can't drift from the copy). */
export function itemImageAlt(item: MenuItem): string {
  return `${item.name} i Fast Food Friends`;
}

/**
 * Real product photography — transparent WebP cutouts served from `/public/menu`.
 * All items have a photo; the map keeps unknown ids safe (falls back to emoji).
 */
const MENU_IMAGES: Record<string, string> = {
  "hamburger-tradicional": "/menu/v2/hamburger-tradicional-480.webp",
  "hamburger-mish-pule": "/menu/v2/hamburger-mish-pule-480.webp",
  "hamburger-me-qyfte": "/menu/v2/hamburger-me-qyfte-480.webp",
  hotdog: "/menu/v2/hotdog-480.webp",
  tost: "/menu/v2/tost-480.webp",
  pomfrit: "/menu/v2/pomfrit-480.webp",
  "coca-cola": "/menu/v2/coca-cola-480.webp",
  fanta: "/menu/v2/fanta-480.webp",
  "uje-natyral": "/menu/v2/uje-natyral-480.webp",
  jogurt: "/menu/v2/jogurt-480.webp",
  ajran: "/menu/v2/ajran-480.webp",
};

export function itemImage(item: MenuItem): string | null {
  return MENU_IMAGES[item.id] ?? null;
}