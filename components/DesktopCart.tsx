"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { CartLineList } from "@/components/CartSheet";
import { formatPrice } from "@/lib/format";

/** Desktop review surface; shares the exact same basket as the mobile drawer. */
export function DesktopCart() {
  const cart = useCart();
  return (
    <aside className="desktop-cart" aria-labelledby="desktop-cart-title">
      <header>
        <div><p className="express-eyebrow">GATI KUR TË JESH TI</p><h2 id="desktop-cart-title">Porosia jote</h2></div>
        <ShoppingBag size={24} aria-hidden="true" />
      </header>
      <div className="desktop-cart-content">
        {cart.lines.length ? (
          <CartLineList lines={cart.lines} setQuantity={cart.setQuantity}
            removeLine={cart.removeLine} clearCart={cart.clearCart} />
        ) : (
          <div className="desktop-cart-empty">
            <ShoppingBag size={36} aria-hidden="true" />
            <h3>Diçka të mirë?</h3>
            <p>Shto të preferuarat nga menuja.<br />Pa llogari. Pa hapa të tepërt.</p>
          </div>
        )}
      </div>
      <footer>
        <dl><div><dt>Nënshuma</dt><dd className="tnum">{formatPrice(cart.subtotalCents)}</dd></div></dl>
        <p>Dorëzimin ose marrjen në lokal e zgjedh në hapin tjetër.</p>
        <button type="button" className="express-primary" onClick={cart.openCheckout}
          disabled={!cart.lines.length} aria-haspopup="dialog">Porosit Tani</button>
      </footer>
    </aside>
  );
}
