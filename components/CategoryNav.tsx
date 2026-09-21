import Link from "next/link";
import { MENU_CATEGORIES, getAvailableItems, type CategoryId } from "@/lib/menu";
import type { CategoryIcon } from "@/lib/menu";

/**
 * Category navigation — server rendered anchor links, no JS needed.
 * The icons are emoji-based to avoid any extra image/font requests.
 */
const CATEGORY_ICONS: Record<CategoryIcon, string> = {
  beef: "🍔",
  salad: "🍟",
  "cup-soda": "🥤",
} as const;

const CATEGORY_ANCHORS: Record<CategoryId, string> = {
  "ushqime-kryesore": "menu",
  shtesa: "shtesa",
  pije: "pije",
};

export function CategoryNav() {
  const sections = MENU_CATEGORIES.map((category) => ({
    category,
    items: getAvailableItems().filter((item) => item.category === category.id),
  }));

  return (
    <nav
      aria-label="Kategoritë e menujës"
      className="mb-8 flex flex-wrap gap-2"
    >
      {sections
        .filter((section) => section.items.length > 0)
        .map(({ category }) => (
          <Link
            key={category.id}
            href={`#${CATEGORY_ANCHORS[category.id]}`}
            className="inline-flex items-center gap-2 rounded-full border border-charcoal-700 bg-charcoal-850 px-4 py-2 text-sm font-medium text-cream-100 transition-all hover:border-flame-500 hover:bg-charcoal-700 hover:text-flame-700"
          >
            <span aria-hidden="true">{CATEGORY_ICONS[category.icon]}</span>
            {category.name}
          </Link>
        ))}
    </nav>
  );
}

export const menuSectionAnchors = CATEGORY_ANCHORS;