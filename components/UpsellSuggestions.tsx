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
      {groups.map(group => (
        <div key={group.kind} className="upsell-group">
          {group.header ? <h3 className="upsell-group-header">{group.header}</h3> : null}
          <ul className="upsell-list">
            {group.suggestions.map(suggestion => {
              const { item, key, display } = suggestion;
              const count = added[key] ?? 0;
              const existing = lines.find(line => line.key === key);
              const atLimit = (existing?.quantity ?? 0) >= ORDER_CONFIG.maxQuantityPerLine ||
                (!existing && lines.length >= ORDER_CONFIG.maxLinesPerOrder);
              return (
                <li key={key} className="upsell-card" data-added={count > 0} data-category={item.category}>
                  <div className="upsell-card-main">
                    <span className={`upsell-art art-${item.category}`} aria-hidden="true">
                      <ItemArt item={item} sizes="(max-width: 639px) 80px, 96px" />
                    </span>
                    <div className="upsell-copy">
                      <h4>{item.name}</h4>
                      <p className="upsell-variant-label">{display.variantLabel ?? (item.category === "pije" ? "E ftohtë" : "Porcion standard")}</p>
                      <strong className="upsell-price tnum">{formatPrice(display.unitPriceCents)}</strong>
                    </div>
                    <div className="upsell-actions">
                      <button
                        type="button"
                        className="upsell-add"
                        disabled={atLimit}
                        onClick={() => add(suggestion)}
                        aria-label={`Shto ${item.name} (+${formatPrice(display.unitPriceCents)})`}
                      >
                        <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
                        <span className="upsell-add-label">{count > 0 ? "Më shumë" : "Shto"}</span>
                      </button>
                    </div>
                  </div>

                  {count > 0 ? (
                    <div className="upsell-status-bar">
                      <span className="upsell-badge">
                        <Check size={13} strokeWidth={3} aria-hidden="true" />
                        <span>{count} në shportë</span>
                      </span>
                      <button
                        type="button"
                        className="upsell-undo-btn"
                        onClick={() => undo(suggestion)}
                        aria-label={`Zhbëj ${item.name}`}
                      >
                        <Undo2 size={13} strokeWidth={2.4} aria-hidden="true" />
                        <span>Zhbëj</span>
                      </button>
                    </div>
                  ) : atLimit ? (
                    <div className="upsell-status-bar is-limit">
                      <span>U arrit kufiri i porosisë</span>
                    </div>
                  ) : null}
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
