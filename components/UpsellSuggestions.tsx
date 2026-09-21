"use client";

import { Check, Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/lib/format";
import { ORDER_CONFIG } from "@/lib/restaurant";
import { ItemArt } from "./ItemArt";
import type { UpsellGroup, UpsellSuggestion } from "@/lib/upsell";

export function UpsellSuggestions({ groups }: { groups: UpsellGroup[] }) {
  const { lines, addLine, setQuantity, removeLine } = useCart();
  const [added, setAdded] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");

  function add(suggestion: UpsellSuggestion) {
    const existing = lines.find(line => line.key === suggestion.key);
    if ((existing?.quantity ?? 0) >= ORDER_CONFIG.maxQuantityPerLine ||
        (!existing && lines.length >= ORDER_CONFIG.maxLinesPerOrder)) return;
    addLine(suggestion.input, suggestion.display);
    const count = (added[suggestion.key] ?? 0) + 1;
    setAdded(previous => ({ ...previous, [suggestion.key]: count }));
    setMessage(`${suggestion.item.name}: ${count} u shtuan. +${formatPrice(suggestion.display.unitPriceCents)}.`);
  }

  function undo(suggestion: UpsellSuggestion) {
    const existing = lines.find(line => line.key === suggestion.key);
    if (!existing || !added[suggestion.key]) return;
    if (existing.quantity === 1) removeLine(existing.key);
    else setQuantity(existing.key, existing.quantity - 1);
    setAdded(previous => ({ ...previous, [suggestion.key]: Math.max(0, (previous[suggestion.key] ?? 0) - 1) }));
    setMessage(`U hoq një ${suggestion.item.name}.`);
  }

  return (
    <section className="upsell" aria-label="Plotëso porosinë">
      <p className="upsell-intro">Pak krokante? Diçka të ftohtë? Vetëm nëse të shijon.</p>
      {groups.map(group => (
        <div key={group.kind} className="upsell-group">
          <h3 className="upsell-group-header">{group.header}</h3>
          <ul className="upsell-list">
            {group.suggestions.map(suggestion => {
              const { item, key, display } = suggestion;
              const count = added[key] ?? 0;
              const existing = lines.find(line => line.key === key);
              const atLimit = (existing?.quantity ?? 0) >= ORDER_CONFIG.maxQuantityPerLine ||
                (!existing && lines.length >= ORDER_CONFIG.maxLinesPerOrder);
              return (
                <li key={key} className="upsell-card" data-added={count > 0}>
                  <span className={`upsell-art art-${item.category}`} aria-hidden="true"><ItemArt item={item} sizes="56px" /></span>
                  <div className="upsell-copy">
                    <h4>{item.name}</h4>
                    <p>{display.variantLabel ?? (item.category === "pije" ? "E ftohtë" : "Porcion standard")}</p>
                    {count > 0 ? (
                      <span className="upsell-added">
                        <Check size={13} aria-hidden="true" />
                        {count} në shportë
                        <button type="button" onClick={() => undo(suggestion)} aria-label={`Hiq një ${item.name}`}>
                          <Undo2 size={12} aria-hidden="true" />Zhbëj
                        </button>
                      </span>
                    ) : atLimit ? (
                      <span className="upsell-added is-limit">U arrit kufiri</span>
                    ) : null}
                  </div>
                  <button type="button" className="upsell-add" disabled={atLimit}
                    onClick={() => add(suggestion)} aria-label={`Shto ${item.name} (+${formatPrice(display.unitPriceCents)})`}>
                    {count ? <Check size={16} aria-hidden="true" className="upsell-check" /> : <Plus size={16} aria-hidden="true" />}
                    <span className="upsell-add-label">Shto</span>
                    <strong className="tnum">{formatPrice(display.unitPriceCents)}</strong>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{message}</p>
    </section>
  );
}
