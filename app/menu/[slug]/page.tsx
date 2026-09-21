import { notFound } from "next/navigation";
import { type Metadata } from "next";
import {
  getAvailableItems,
  getItemBySlug,
  itemImage,
} from "@/lib/menu";
import { ItemArt } from "@/components/ItemArt";
import { JsonLd } from "@/components/JsonLd";
import { MenuItemCard } from "@/components/MenuItemCard";
import { buildBreadcrumbJsonLd, buildMenuItemJsonLd, buildPageMetadata } from "@/lib/seo";

/**
 * Product detail for a single menu item — statically generated at build time and
 * revalidated every 5 minutes to stay in sync with the menu data.
 */
export const dynamicParams = false;
export const revalidate = 300; // = HOURS_REVALIDATE_SECONDS (must be a literal for Next)
export const runtime = "nodejs";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getAvailableItems().map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getItemBySlug(slug);
  if (!item) {
    return { title: "Artikulli nuk ekziston · Fast Food Friends" };
  }

  return buildPageMetadata({
    title: `${item.name} — Fast Food Friends`,
    description: item.description,
    path: `/menu/${item.slug}`,
    imageAlt: item.name,
  });
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getItemBySlug(slug);

  if (!item) {
    notFound();
  }

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Ballina", path: "/" },
    { name: "Menuja", path: "/menu" },
    { name: item.name, path: `/menu/${item.slug}` },
  ]);

  return (
    <article className="py-10">
      <JsonLd data={breadcrumb} id="breadcrumb-jsonld" />
      <JsonLd data={buildMenuItemJsonLd(item)} id="item-jsonld" />

      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-5">
        <div className="md:col-span-2 md:col-start-1">
          <div className="menu-item-hero flex h-64 w-full items-center justify-center rounded-card border border-charcoal-800 bg-charcoal-800">
            {itemImage(item) && (
              <link
                rel="preload"
                as="image"
                href={`/menu/v2/${item.id}-480.webp`}
                imageSrcSet={`/menu/v2/${item.id}-480.avif 480w, /menu/v2/${item.id}-720.avif 720w`}
                imageSizes="(max-width: 768px) 90vw, 384px"
                fetchPriority="high"
              />
            )}
            <ItemArt
              item={item}
              alt={item.name}
              variant="hero"
              eager
              sizes="(max-width: 768px) 90vw, 384px"
              className="h-full w-full object-contain p-6"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <header>
            <p className="text-sm font-medium text-flame-600">
              {item.category === "ushqime-kryesore"
                ? "Ushqim kryesor"
                : item.category === "shtesa"
                  ? "Shtesë"
                  : "Pije"}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-cream-50 sm:text-3xl">
              {item.name}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-cream-200/75">
              {item.description}
            </p>
          </header>

          {item.tags?.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-flame-500/10 px-2.5 py-1 text-[11px] font-semibold text-flame-600"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          {item.allergens?.length ? (
            <p className="mt-3 text-xs text-cream-200/60">
              <span className="font-medium text-cream-100">Pikël:</span>{" "}
              {item.allergens.join(", ")}
            </p>
          ) : null}

          <div className="mt-6">
            <MenuItemCard item={item} />
          </div>
        </div>
      </div>
    </article>
  );
}
