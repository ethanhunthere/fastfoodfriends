"use client";

import { useState, type ReactNode } from "react";
import { Hamburger, CupSoda, Utensils, LayoutGrid } from "lucide-react";

const filters = [
  { id: "ushqime-kryesore", label: "Ushqime", icon: Hamburger },
  { id: "shtesa", label: "Shtesa", icon: Utensils },
  { id: "pije", label: "Pije", icon: CupSoda },
  { id: "all", label: "Të gjitha", icon: LayoutGrid },
];

/** Keeps the server-rendered menu in the DOM; category changes need no fetch. */
export function MenuBrowser({ children }: { children: ReactNode }) {
  const [active, setActive] = useState("ushqime-kryesore");
  return (
    <div className="express-menu" data-active={active}>
      <nav className="express-categories" aria-label="Kategoritë e menusë">
        {filters.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={active === id}
            onClick={() => {
              setActive(id);
              const menu = document.getElementById("menu-browse");
              if (menu && menu.getBoundingClientRect().top < parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height"))) {
                menu.scrollIntoView({ block: "start" });
              }
            }}>
            <Icon size={17} aria-hidden="true" />{label}
          </button>
        ))}
      </nav>
      <div className="express-sections">{children}</div>
    </div>
  );
}
