"use client";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartProvider";
export function HeaderCartButton({ className = "" }: { className?: string }) {
  const { itemCount, openCart, hydrated } = useCart();
  const count = hydrated ? itemCount : 0;
  return <button type="button" onClick={openCart} aria-haspopup="dialog"
    aria-label={`Shporta, ${count} artikuj`} className={`express-header-cart ${className}`}>
    <ShoppingBag size={16} strokeWidth={2.4} aria-hidden="true" />
    <span className="express-header-cart-label">Shporta</span>
    <span className="express-cart-badge" key={count} aria-hidden="true"><span className="tnum">{count}</span></span>
  </button>;
}
