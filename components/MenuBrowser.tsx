"use client";

import { useState, type ReactNode } from "react";
import { Hamburger, CupSoda } from "lucide-react";

const filters = [
  { id: "ushqime-kryesore", label: "Ushqime", icon: Hamburger, count: 4 },
  { id: "pije", label: "Pije", icon: CupSoda, count: 4 },
];

/** Keeps the server-rendered menu in the DOM; category changes need no fetch. */
export function MenuBrowser({ children }: { children: ReactNode }) {
  const [active, setActive] = useState("ushqime-kryesore");
  return (
    <div className="express-menu" data-active={active}>
      <nav className="express-categories" aria-label="Kategoritë e menusë">
        {filters.map(({ id, label, icon: Icon, count }) => (
          <button key={id} type="button" aria-pressed={active === id}
            onClick={() => {
              setActive(id);
              const menu = document.getElementById("menu-browse");
              if (menu && menu.getBoundingClientRect().top < parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height"))) {
                menu.scrollIntoView({ block: "start" });
              }
            }}>
            <Icon size={17} aria-hidden="true" className="express-cat-icon" />
            <span>{label}</span>
            <span className="express-cat-count">{count}</span>
          </button>
        ))}
      </nav>
      <div className="express-sections">{children}</div>
    </div>
  );
}
