/**
 * Menu — the authoritative data source.
 *
 * Every price lives here in **integer cents**. The browser receives a serialised
 * copy for rendering, but the Server Action re-resolves every line against this
 * module, so the client can never tamper with the total.
 */

export type CategoryId = "ushqime-kryesore" | "pije";

/** Icon keys mapped to lucide-react components in the UI layer. */
export type CategoryIcon = "beef" | "cup-soda";

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
    name: "Ushqime",
    blurb:
      "Hamburgera, tosta, hotdog e pomfrit — t'nxehta n'moment.",
    icon: "beef",
  },
  {
    id: "pije",
    name: "Pije",
    blurb: "Pije t'ftohta, ujë, jogurt e ajran.",
    icon: "cup-soda",
  },
] as const;

/* ------------------------------------------------------------------ *
 *  Reusable modifier groups
 * ------------------------------------------------------------------ */

/** Sandwich toppings — the essentials only. Anything unusual goes in the
    free-text field at checkout. */
const SANDWICH_GROUP: ModifierGroup = {
  id: "perberesit",
  label: "Përbërësit",
  helpText: "Zgjedh qysh e don.",
  options: [
    { id: "pa-qepe", label: "Pa qepë", priceDeltaCents: 0 },
    { id: "pa-domate", label: "Pa domate", priceDeltaCents: 0 },
    { id: "pa-sallate", label: "Pa sallatë", priceDeltaCents: 0 },
    { id: "ekstra-majonez", label: "Ekstra majonez", priceDeltaCents: 20 },
    { id: "ekstra-djath", label: "Ekstra djathë", priceDeltaCents: 50 },
  ],
};

const GRILL_GROUP: ModifierGroup = {
  id: "perberesit",
  label: "Përbërësit",
  helpText: "Zgjedh qysh e don.",
  options: [
    { id: "pa-mustarde", label: "Pa mustardë", priceDeltaCents: 0 },
    { id: "pa-ketchup", label: "Pa ketchup", priceDeltaCents: 0 },
    { id: "ekstra-majonez", label: "Ekstra majonez", priceDeltaCents: 20 },
    { id: "pikante", label: "Pikante", priceDeltaCents: 20 },
  ],
};

const TOST_GROUP: ModifierGroup = {
  id: "perberesit-tost",
  label: "Përbërësit",
  helpText: "Zgjedh qysh e don.",
  options: [
    { id: "ekstra-djath", label: "Ekstra djathë", priceDeltaCents: 50 },
    { id: "ekstra-proshut", label: "Ekstra proshutë", priceDeltaCents: 50 },
    { id: "majonez", label: "Majonez", priceDeltaCents: 20 },
    { id: "pikante", label: "Pikante", priceDeltaCents: 20 },
  ],
};

const FRIES_GROUP: ModifierGroup = {
  id: "shtesat",
  label: "Shtesa",
  helpText: "Bëj pomfritin si e do ti.",
  options: [
    { id: "pa-krip", label: "Pa kripë", priceDeltaCents: 0 },
    { id: "djath-i-shkrire", label: "Djathë i shkrirë", priceDeltaCents: 50 },
    { id: "pikante", label: "Pluhur pikant", priceDeltaCents: 0 },
    { id: "majonez", label: "Majonez", priceDeltaCents: 20 },
    { id: "ketchup", label: "Ketchup", priceDeltaCents: 20 },
  ],
};

/* ------------------------------------------------------------------ *
 *  Menu items
 * ------------------------------------------------------------------ */

export const MENU_ITEMS: readonly MenuItem[] = [
  {
    id: "hamburger",
    slug: "hamburger",
    name: "Hamburger",
    category: "ushqime-kryesore",
    description: "Mish viçi, sallatë, domate e sos n'kifle.",
    priceCents: 200,
    modifierGroups: [SANDWICH_GROUP],
    tags: ["Klasik"],
    allergens: ["Gluten", "Qumësht", "Susam"],
    available: true,
    featured: true,
    prepMinutes: 7,
  },
  {
    id: "chickenburger",
    slug: "chickenburger",
    name: "Chickenburger",
    category: "ushqime-kryesore",
    description: "Pulë krokante me sallatë e majonez n'kifle.",
    priceCents: 200,
    modifierGroups: [SANDWICH_GROUP],
    tags: ["Krokant"],
    allergens: ["Gluten", "Qumësht", "Susam"],
    available: true,
    featured: true,
    prepMinutes: 8,
  },
  {
    id: "cheeseburger",
    slug: "cheeseburger",
    name: "Cheeseburger",
    category: "ushqime-kryesore",
    description: "Mish viçi me kaçkavall t'shkrirë, sallatë e qepë.",
    priceCents: 250,
    modifierGroups: [SANDWICH_GROUP],
    tags: ["Popullor"],
    allergens: ["Gluten", "Qumësht", "Susam"],
    available: true,
    featured: true,
    prepMinutes: 7,
  },
  {
    id: "friends-burger",
    slug: "friends-burger",
    name: "Friends Burger",
    category: "ushqime-kryesore",
    description: "Dopio mish, dopio kaçkavall e krejt sosat — specialitet i shpisë.",
    priceCents: 350,
    modifierGroups: [SANDWICH_GROUP],
    tags: ["Specialitet", "Dopio"],
    allergens: ["Gluten", "Qumësht", "Susam"],
    available: true,
    featured: true,
    prepMinutes: 10,
  },
  {
    id: "hotdog",
    slug: "hotdog",
    name: "Hot Dog",
    category: "ushqime-kryesore",
    description: "Virshlle n'kifle t'butë me senf e keçap.",
    priceCents: 100,
    modifierGroups: [GRILL_GROUP],
    tags: ["Shpejt"],
    allergens: ["Gluten", "Mustardë"],
    available: true,
    prepMinutes: 5,
  },
  {
    id: "tost",
    slug: "tost",
    name: "Tost",
    category: "ushqime-kryesore",
    description: "Tost n'zgarë me proshutë e kaçkavall.",
    priceCents: 100,
    modifierGroups: [TOST_GROUP],
    allergens: ["Gluten", "Qumësht"],
    available: true,
    prepMinutes: 5,
  },
  {
    id: "pomfrit-porcion",
    slug: "pomfrit-porcion",
    name: "Pomfrit Porcion",
    category: "ushqime-kryesore",
    description: "Patate t'skuqura krokante — porcion i plotë.",
    priceCents: 150,
    modifierGroups: [FRIES_GROUP],
    tags: ["Krokant"],
    allergens: [],
    vegetarianOption: true,
    available: true,
    prepMinutes: 5,
  },
  {
    id: "pomfrit-1-2",
    slug: "pomfrit-1-2",
    name: "Pomfrit 1/2",
    category: "ushqime-kryesore",
    description: "Gjysmë porcioni patate krokante me kripë.",
    priceCents: 100,
    modifierGroups: [FRIES_GROUP],
    allergens: [],
    vegetarianOption: true,
    available: true,
    prepMinutes: 4,
  },
  {
    id: "tost-me-proshut",
    slug: "tost-me-proshut",
    name: "Tost me Proshut",
    category: "ushqime-kryesore",
    description: "Tost i thekun me proshutë t'bollshme e kaçkavall.",
    priceCents: 150,
    modifierGroups: [TOST_GROUP],
    allergens: ["Gluten", "Qumësht"],
    available: true,
    prepMinutes: 5,
  },
  {
    id: "tost-proshut-rrumbullak",
    slug: "tost-proshut-rrumbullak",
    name: "Tost Proshut Rrumbullak",
    category: "ushqime-kryesore",
    description: "Tost n'kifle t'rrumbullakët me proshutë e kaçkavall.",
    priceCents: 200,
    modifierGroups: [TOST_GROUP],
    tags: ["Specialitet"],
    allergens: ["Gluten", "Qumësht"],
    available: true,
    prepMinutes: 6,
  },
  {
    id: "coca-cola",
    slug: "coca-cola",
    name: "Coca-Cola",
    category: "pije",
    description: "E ftohtë akull.",
    priceCents: 120,
    available: true,
    prepMinutes: 1,
  },
  {
    id: "uje-rugove",
    slug: "uje-rugove",
    name: "Ujë Rugovë",
    category: "pije",
    description: "Ujë natyral burimor, i ftohtë.",
    priceCents: 80,
    available: true,
    prepMinutes: 1,
  },
  {
    id: "jogurt",
    slug: "jogurt",
    name: "Jogurt",
    category: "pije",
    description: "Jogurt i freskët e i ftohtë.",
    priceCents: 90,
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
    description: "Ajran tradicional i ftohtë me kripë.",
    priceCents: 100,
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
    hamburger: "🍔",
    chickenburger: "🍗",
    cheeseburger: "🧀",
    "friends-burger": "👑",
    hotdog: "🌭",
    tost: "🥪",
    "pomfrit-porcion": "🍟",
    "pomfrit-1-2": "🍟",
    "tost-me-proshut": "🥪",
    "tost-proshut-rrumbullak": "🥪",
    "coca-cola": "🥤",
    "uje-rugove": "💧",
    jogurt: "🥣",
    ajran: "🧋",
    // aliases
    "hamburger-tradicional": "🍔",
    "hamburger-mish-pule": "🍗",
    pomfrit: "🍟",
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
  hamburger: "/menu/v4/hamburger-480.webp",
  chickenburger: "/menu/v4/chickenburger-480.webp",
  cheeseburger: "/menu/v4/cheeseburger-480.webp",
  "friends-burger": "/menu/v4/friends-burger-480.webp",
  hotdog: "/menu/v4/hotdog-480.webp",
  tost: "/menu/v4/tost-480.webp",
  "pomfrit-porcion": "/menu/v4/pomfrit-porcion-480.webp",
  "pomfrit-1-2": "/menu/v4/pomfrit-1-2-480.webp",
  "tost-me-proshut": "/menu/v4/tost-me-proshut-480.webp",
  "tost-proshut-rrumbullak": "/menu/v4/tost-proshut-rrumbullak-480.webp",
  "coca-cola": "/menu/v4/coca-cola-480.webp",
  "uje-rugove": "/menu/v4/uje-rugove-480.webp",
  jogurt: "/menu/v4/jogurt-480.webp",
  ajran: "/menu/v4/ajran-480.webp",
  // backwards-compat aliases:
  "hamburger-tradicional": "/menu/v4/hamburger-480.webp",
  "hamburger-mish-pule": "/menu/v4/chickenburger-480.webp",
  pomfrit: "/menu/v4/pomfrit-porcion-480.webp",
};

export function itemImage(item: MenuItem): string | null {
  return MENU_IMAGES[item.id] ?? null;
}