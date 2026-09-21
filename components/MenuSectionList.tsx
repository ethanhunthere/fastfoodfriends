import { MenuItemCard } from "@/components/MenuItemCard";
import { MenuBrowser } from "@/components/MenuBrowser";
import { getMenuSections } from "@/lib/menu";

export function MenuSectionList({ limit }: { limit?: number }) {
  return <MenuBrowser>{getMenuSections().map(({category, items}, sectionIndex) => (
    <section key={category.id} data-category={category.id} aria-labelledby={`cat-${category.id}`}>
      <header className="express-section-heading">
        <h2 id={`cat-${category.id}`}>{category.name}</h2>
        <span>{items.length} zgjedhje</span>
      </header>
      <ul className="express-item-list">
        {(limit === undefined ? items : items.slice(0, limit)).map((item, itemIndex) => (
          <li key={item.id}><MenuItemCard item={item} eager={sectionIndex === 0 && itemIndex < 2} /></li>
        ))}
      </ul>
    </section>
  ))}</MenuBrowser>;
}
export function FullMenu() { return <MenuSectionList />; }
