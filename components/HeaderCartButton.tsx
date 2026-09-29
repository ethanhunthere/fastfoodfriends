"use client";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/format";

export function HeaderCartButton({ className = "" }: { className?: string }) {
  const { itemCount, subtotalCents, openCart, hydrated } = useCart();
  const count = hydrated ? itemCount : 0;
  const subtotal = hydrated ? subtotalCents : 0;
  return (
    <button
      type="button"
      onClick={openCart}
      aria-haspopup="dialog"
      aria-label={`Shporta, ${count} artikuj, ${formatPrice(subtotal)}`}
      className={`express-header-cart ${className}`}
    >
      <ShoppingBag size={16} strokeWidth={2.4} aria-hidden="true" />
      <span className="express-header-cart-label">Shporta</span>
      {count > 0 && (
        <span className="express-header-cart-subtotal tnum" aria-hidden="true">
          {formatPrice(subtotal)}
        </span>
      )}
      <span className="express-cart-badge" key={count} aria-hidden="true">
        <span className="tnum">{count}</span>
      </span>
    </button>
  );
}
