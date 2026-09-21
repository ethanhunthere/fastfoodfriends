"use client";

/**
 * Cart sheet — review, adjust quantities, then continue to checkout.
 * Client component (it needs cart state); the Server Action does all pricing.
 */
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { Modal } from "@/components/Modal";
import { describeCartLine } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { ORDER_CONFIG } from "@/lib/restaurant";

function minimumOrderLabel(): string {
  return `${(ORDER_CONFIG.minimumOrderCents / 100).toFixed(2).replace(".", ",")} €`;
}

export function CartSheet() {
  const {
    lines,
    itemCount,
    totalsFor,
    isCartOpen,
    closeCart,
    openCheckout,
    setQuantity,
    removeLine,
    clearCart,
    hydrated,
  } = useCart();

  const totals = totalsFor("delivery");
  const belowMinimum =
    lines.length > 0 && totals.subtotalCents < ORDER_CONFIG.minimumOrderCents;

  return (
    <Modal
      open={isCartOpen}
      onClose={closeCart}
      title={`Shporta (${hydrated ? itemCount : 0})`}
      titleId="cart-sheet-title"
      footer={
        lines.length > 0 ? (
          <div className="space-y-3">
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-cream-200">Nënshuma</dt>
                <dd className="tnum text-cream-50">
                  {formatPrice(totals.subtotalCents)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-cream-200">Dorëzimi</dt>
                <dd className="tnum text-cream-50">
                  {totals.deliveryFeeCents === 0
                    ? "Falas"
                    : formatPrice(totals.deliveryFeeCents)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-charcoal-700 pt-2 text-base">
                <dt className="font-semibold text-cream-50">Totali</dt>
                <dd className="tnum font-display text-xl font-bold text-flame-700">
                  {formatPrice(totals.totalCents)}
                </dd>
              </div>
            </dl>

            {belowMinimum ? (
              <p className="rounded-lg bg-flame-500/10 px-3 py-2 text-xs text-flame-300">
                Porosia minimale për dorëzim është {minimumOrderLabel()}. Shto edhe një
                artikull, ose zgjidh &quot;Marrje në lokal&quot; në hapin tjetër.
              </p>
            ) : null}

            <button
              type="button"
              onClick={openCheckout}
              className="express-primary"
            >
              Porosit Tani
            </button>

            <p className="text-center text-xs text-cream-200">
              Konfirmimi bëhet me telefon pas dërgimit të porosisë.
            </p>
          </div>
        ) : null
      }
    >
      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <ShoppingBag aria-hidden="true" className="h-11 w-11 text-charcoal-500" />
          <p className="font-medium text-cream-100">Shporta është bosh</p>
          <p className="max-w-xs text-sm text-cream-200">
            Zgjidh një hamburger, hotdog ose pomfrit nga menuja dhe ai do të shfaqet
            këtu.
          </p>
          <Link
            href="/#menu"
            onClick={closeCart}
            className="mt-1 inline-flex min-h-11 items-center rounded-md border border-charcoal-700 px-4 text-sm font-medium text-cream-100 hover:border-flame-500 hover:text-flame-700"
          >
            Shiko menunë
          </Link>
        </div>
      ) : (
        <CartLineList
          lines={lines}
          setQuantity={setQuantity}
          removeLine={removeLine}
          clearCart={clearCart}
        />
      )}
    </Modal>
  );
}

interface CartLineListProps {
  lines: ReturnType<typeof useCart>["lines"];
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
}

export function CartLineList({
  lines,
  setQuantity,
  removeLine,
  clearCart,
}: CartLineListProps) {
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {lines.map((line) => (
          <li
            key={line.key}
            className="cart-line rounded-card border border-charcoal-800 bg-charcoal-850 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-cream-50">{describeCartLine(line)}</p>
                <p className="tnum mt-0.5 text-xs text-cream-200">
                  {formatPrice(line.unitPriceCents)} / copë
                </p>
              </div>
              <p className="tnum shrink-0 font-semibold text-flame-700">
                {formatPrice(line.unitPriceCents * line.quantity)}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div
                className="inline-flex items-center rounded-md border border-charcoal-700"
                role="group"
                aria-label={`Sasia për ${line.name}`}
              >
                <button
                  type="button"
                  onClick={() => setQuantity(line.key, line.quantity - 1)}
                  disabled={line.quantity <= 1}
                  className="flex h-11 w-11 items-center justify-center rounded-l-md text-cream-100 disabled:opacity-40"
                  aria-label={`Zbrit sasinë e ${line.name}`}
                >
                  <Minus aria-hidden="true" className="h-4 w-4" />
                </button>
                <span className="tnum w-8 text-center text-sm font-semibold text-cream-50">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(line.key, line.quantity + 1)}
                  disabled={line.quantity >= ORDER_CONFIG.maxQuantityPerLine}
                  className="flex h-11 w-11 items-center justify-center rounded-r-md text-cream-100 disabled:opacity-40"
                  aria-label={`Shto sasinë e ${line.name}`}
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeLine(line.key)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-cream-200 hover:text-flame-700"
              >
                <Trash aria-hidden="true" className="h-4 w-4" />
                Hiq
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={clearCart}
          className="inline-flex min-h-11 items-center text-xs font-medium text-cream-200 underline decoration-charcoal-600 underline-offset-4 hover:text-flame-700"
        >
          Zbraz shportën
        </button>
      </div>
    </div>
  );
}