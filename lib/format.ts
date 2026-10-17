/**
 * Money helpers.
 *
 * All prices in this app are stored as **integer cents** (EUR) so that cart
 * maths is exact — no floating point drift like `2.5 + 3.2 = 5.7`-ish surprises.
 *
 * Formatting is intentionally hand-rolled instead of `Intl.NumberFormat` so the
 * output is byte-identical on the server and the client (no ICU/locale
 * differences → no React hydration mismatch, no currency reflow).
 */

export const CURRENCY_SYMBOL = "€";

/** `1234` → `"12,44 €"` (Kosovo/Albanian decimal comma, symbol suffixed). */
export function formatPrice(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole},${fraction} ${CURRENCY_SYMBOL}`;
}

/** `1234` → `"12.34"` — Schema.org / offer prices must use a dot decimal. */
export function formatPriceMachine(cents: number): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0;
  return (safe / 100).toFixed(2);
}

/** 4-digit numeric order code, e.g. "4821". Random integer between 1000 and 9999. */
export function createOrderNumber(): string {
  const code = Math.floor(1000 + Math.random() * 9000);
  return String(code);
}

/** `1` → `"1x Hamburger"`. */
export function formatQuantityLabel(quantity: number, name: string): string {
  return `${quantity}x ${name}`;
}

/** Delivery ETA window label, e.g. `"25–40 min"`. */
export function formatEtaRange(minMinutes: number, maxMinutes: number): string {
  return `${minMinutes}–${maxMinutes} min`;
}