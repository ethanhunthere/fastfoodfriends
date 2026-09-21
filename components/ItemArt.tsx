import { itemEmoji, itemImage, type MenuItem } from "@/lib/menu";
import { IMAGE_DIMS } from "@/lib/image-dims";

/** Width tiers baked into /public/menu/v2 by scripts/bake-images.cjs. */
const WIDTHS = { tile: [240, 480], hero: [480, 720] } as const;

function srcSetFor(id: string, ext: "avif" | "webp", widths: readonly number[]) {
  return widths.map((w) => `/menu/v2/${id}-${w}.${ext} ${w}w`).join(", ");
}

/**
 * Product artwork used inside fixed-size tiles (CLS-free). Serves pre-baked
 * AVIF/WebP cutouts (no runtime optimizer hop, no upscaling); falls back to
 * the emoji stand-in when an item has no photo.
 */
export function ItemArt({
  item,
  alt = "",
  sizes = "76px",
  variant = "tile",
  eager = false,
  className,
}: {
  item: MenuItem;
  alt?: string;
  sizes?: string;
  variant?: keyof typeof WIDTHS;
  eager?: boolean;
  className?: string;
}) {
  if (!itemImage(item)) {
    return (
      <span aria-hidden="true" className={className}>
        {itemEmoji(item)}
      </span>
    );
  }
  const dims = IMAGE_DIMS[item.id];
  return (
    <picture>
      <source type="image/avif" srcSet={srcSetFor(item.id, "avif", WIDTHS[variant])} sizes={sizes} />
      <source type="image/webp" srcSet={srcSetFor(item.id, "webp", WIDTHS[variant])} sizes={sizes} />
      <img
        src={`/menu/v2/${item.id}-${WIDTHS[variant][0]}.webp`}
        alt={alt}
        aria-hidden={alt ? undefined : "true"}
        width={dims?.w ?? 240}
        height={dims?.h ?? 240}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        draggable={false}
        className={className}
      />
    </picture>
  );
}