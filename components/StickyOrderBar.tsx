"use client";

/**
 * Sticky mobile order bar — the primary conversion surface.
 *
 * Always mounted so its height is reserved on first paint → **no layout shift**
 * when cart hydration lands. Shows the live item count + subtotal (delivery fee
 * excluded) and the primary "Porosit Tani" action which opens the checkout.
 */
import { ArrowRight } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/format";

export function StickyOrderBar() {
  const { itemCount, subtotalCents, openCart, openCheckout, hydrated } = useCart();

  const count = hydrated ? itemCount : 0;
  const subtotal = hydrated ? subtotalCents : 0;
  const hasItems = count > 0;

  return <>
    <div aria-hidden="true" className="cart-bar-spacer" />
    <div className="express-cart-bar no-print">
      <div className="express-cart-bar-inner">
        <p aria-live="polite" aria-atomic="true" className="sr-only">Shporta: {count} artikuj, {formatPrice(subtotal)}</p>
        <button type="button" className="express-cart-review" onClick={openCart}
          aria-label={`Shiko Shportën, ${count} artikuj, ${formatPrice(subtotal)}`} aria-haspopup="dialog">
          <span className="express-cart-count tnum">{count}</span>
          <span>
            <strong className="tnum">{formatPrice(subtotal)}</strong>
            <small>Shiko Shportën</small>
          </span>
        </button>
        <button type="button" className="express-primary" onClick={openCheckout}
          disabled={!hasItems} aria-haspopup="dialog">
          Porosit Tani <ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  </>;
}
