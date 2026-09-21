"use client";

/**
 * Interactive menu card.
 *
 * One of the few genuine client components — every product page needs local
 * state for its variant/modifier pickers. Kept cheap:
 *   - display price is computed with the same `resolveLine` the Server Action
 *     uses, so what you see is exactly what the server will charge,
 *   - no images (no CLS, zero image requests — a colourful icon stands in),
 *   - options mount only inside the customization sheet.
 */
import { Plus, Minus } from "lucide-react";
import { useState, useId } from "react";
import { Modal } from "./Modal";
import { formatPrice } from "@/lib/format";
import {
  getDefaultVariantId,
  resolveLine,
  type ItemVariant,
  type MenuItem,
  type ModifierGroup,
} from "@/lib/menu";
import { ItemArt } from "./ItemArt";
import { ORDER_CONFIG } from "@/lib/restaurant";
import { buildLineKey } from "@/lib/cart";
import { useCart } from "./CartProvider";

export interface MenuItemCardProps {
  item: MenuItem;
  /** Above-the-fold items render eagerly with high fetch priority (LCP). */
  eager?: boolean;
}

export function MenuItemCard({ item, eager = false }: MenuItemCardProps) {
  const { addLine, lines, setQuantity, removeLine } = useCart();
  const instanceId = useId();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantityDraft] = useState(1);
  const [variantId, setVariantId] = useState<string | null>(getDefaultVariantId(item));
  const [modifierIds, setModifierIds] = useState<Record<string, string[]>>(() =>
    Object.fromEntries((item.modifierGroups ?? []).map((group) => [group.id, []])),
  );

  function collectSelectedModifiers(): string[] {
    return Object.values(modifierIds).flat();
  }

  const resolved = resolveLine(item, variantId, collectSelectedModifiers());
  const unitPriceCents = resolved?.unitPriceCents ?? item.priceCents;

  function onToggleModifier(group: ModifierGroup, optionId: string) {
    const current = new Set(modifierIds[group.id] ?? []);
    if (current.has(optionId)) {
      current.delete(optionId);
    } else if (group.maxSelections === 1) {
      current.clear();
      current.add(optionId);
    } else if (group.maxSelections === undefined || current.size < group.maxSelections) {
      current.add(optionId);
    }
    setModifierIds((previous) => ({
      ...previous,
      [group.id]: Array.from(current),
    }));
  }

  function resetCustomisation() {
    setVariantId(getDefaultVariantId(item));
    setModifierIds(
      Object.fromEntries((item.modifierGroups ?? []).map((group) => [group.id, []])),
    );
    setQuantityDraft(1);
  }

  function handleAdd() {
    const display = {
      name: item.name,
      variantLabel: resolved?.variant?.label ?? null,
      modifierLabels: resolved?.modifiers.map((modifier) => modifier.label) ?? [],
      unitPriceCents,
    };
    addLine(
      {
        itemId: item.id,
        variantId,
        modifierIds: collectSelectedModifiers(),
        quantity,
      },
      display,
    );
    resetCustomisation();
    setOpen(false);
  }

  const hasOptions = Boolean(
    (item.variants && item.variants.length > 1) ||
      (item.modifierGroups && item.modifierGroups.length > 0),
  );

  /** The quick action either opens the customiser or adds a default line. */
  function onQuickAdd() {
    if (hasOptions) {
      setOpen(true);
    } else {
      handleAdd();
    }
  }

  /**
   * Stepper state — the card manages the item's *default* configuration line.
   * Custom configurations live as separate lines and are never hijacked here.
   */
  const defaultVariantId = getDefaultVariantId(item);
  const canonicalKey = buildLineKey(item.id, defaultVariantId, []);
  const canonicalLine = lines.find((line) => line.key === canonicalKey);

  function incrementCanonical() {
    if (!canonicalLine) return;
    setQuantity(
      canonicalKey,
      Math.min(canonicalLine.quantity + 1, ORDER_CONFIG.maxQuantityPerLine),
    );
  }

  /** Last step down removes the line entirely — one tap to undo an add. */
  function decrementCanonical() {
    if (!canonicalLine) return;
    if (canonicalLine.quantity <= 1) removeLine(canonicalKey);
    else setQuantity(canonicalKey, canonicalLine.quantity - 1);
  }

  return (
    <article className="express-item">
      <button className={`express-food-art art-${item.category}`} type="button"
        aria-label={`Personalizo ${item.name}`} onClick={() => setOpen(true)}>
        <ItemArt item={item} className="express-food-img" eager={eager} sizes="(max-width: 639px) 104px, 112px" />
      </button>
      <div className="express-item-body">
        <button type="button" className="express-item-copy" onClick={() => setOpen(true)} aria-haspopup="dialog">
          {item.featured && <span className="express-item-tag">E preferuara</span>}
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </button>
        <div className="express-item-foot">
          <strong className="express-item-price tnum">{formatPrice(item.priceCents)}</strong>
          {canonicalLine ? (
            <div className="express-stepper" role="group" aria-label={`Sasia e ${item.name} në shportë`}>
              <button type="button" onClick={decrementCanonical}
                aria-label={canonicalLine.quantity === 1 ? `Hiq ${item.name} nga shporta` : `Hiq një ${item.name}`}>
                <Minus size={16} aria-hidden="true" />
              </button>
              <span className="express-stepper-count tnum" aria-live="polite">{canonicalLine.quantity}</span>
              <button type="button" onClick={incrementCanonical} disabled={canonicalLine.quantity >= ORDER_CONFIG.maxQuantityPerLine}
                aria-label={`Shto një ${item.name} tjetër`}>
                <Plus size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={onQuickAdd} className="express-add"
              aria-label={`Shto ${item.name}`} aria-haspopup={hasOptions ? "dialog" : undefined}>
              Shto
            </button>
          )}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={item.name}
        titleId={`customize-${instanceId}`} footer={
          <div className="express-customizer-footer">
            <QuantityRow quantity={quantity} setQuantity={setQuantityDraft} />
            <button type="button" className="express-primary" onClick={handleAdd} disabled={!resolved}>
              Shto në shportë <span className="tnum">{formatPrice(unitPriceCents * quantity)}</span>
            </button>
          </div>
        }>
        <div className="express-customizer-intro">
          <ItemArt item={item} className="express-food-img" sizes="220px" /><p>{item.description}</p>
        </div>
        <div className="express-options">{renderVariants()}{renderModifierGroups()}</div>
        {!!item.allergens?.length && <p className="express-allergens">Alergjenë: {item.allergens.join(", ")}</p>}
      </Modal>
    </article>
  );

  function renderVariants() {
    if (!item.variants || item.variants.length <= 1) return null;
    return (
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-cream-200/80">
          Varianta
        </legend>
        <div className="express-choice-grid">
          {item.variants.map((variant: ItemVariant) => (
            <label key={variant.id} className="express-choice">
              <input
                type="radio"
                name={`variant-${instanceId}`}
                value={variant.id}
                checked={variantId === variant.id}
                onChange={() => setVariantId(variant.id)}
                className="accent-flame-500"
              />
              {variant.label}{variant.priceDeltaCents > 0 && <small>+{formatPrice(variant.priceDeltaCents)}</small>}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  function renderModifierGroups() {
    if (!item.modifierGroups || item.modifierGroups.length === 0) return null;
    return item.modifierGroups.map((group: ModifierGroup) => (
      <fieldset key={group.id} className="space-y-2">
        <legend className="text-xs font-semibold text-cream-200/80">
          {group.label}
        </legend>
        {group.helpText ? (
          <p className="text-[11px] text-cream-200/55">{group.helpText}</p>
        ) : null}
        <div className="express-choice-grid">
          {group.options.map((option) => {
            const checked = (modifierIds[group.id] ?? []).includes(option.id);
            return (
              <label key={option.id} className="express-choice">
                <input
                  type={group.maxSelections === 1 ? "radio" : "checkbox"}
                  name={group.maxSelections === 1 ? `mod-${instanceId}-${group.id}` : undefined}
                  value={option.id}
                  checked={checked}
                  onChange={() => onToggleModifier(group, option.id)}
                  className="accent-flame-500"
                />
                {option.label}
                {option.priceDeltaCents > 0 ? (
                  <span className="tnum text-xs text-cream-200/60">
                    (+{formatPrice(option.priceDeltaCents)})
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>
    ));
  }
}


function QuantityRow({
  quantity,
  setQuantity,
}: {
  quantity: number;
  setQuantity: (value: number) => void;
}) {
  return (
    <div className="express-quantity">
      <button
        type="button"
        onClick={() => setQuantity(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-charcoal-700 text-cream-100 disabled:opacity-40"
        aria-label="Zbrit sasinë"
      >
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>
      <span className="tnum w-7 text-center font-semibold text-cream-50">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() =>
          setQuantity(Math.min(quantity + 1, ORDER_CONFIG.maxQuantityPerLine))
        }
        disabled={quantity >= ORDER_CONFIG.maxQuantityPerLine}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-charcoal-700 text-cream-100 disabled:opacity-40"
        aria-label="Shto një copë"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
