"use client";

/**
 * Cart state.
 *
 * Design notes (why this is the *only* global client state in the app):
 *  - The initial render is always an empty cart, identical on server and client,
 *    so there is **no hydration mismatch** and no layout shift in the sticky bar
 *    (the bar reserves its height before any JS runs).
 *  - localStorage is read in an effect *after* mount and written back on every
 *    change, so a refresh keeps the basket without blocking first paint.
 *  - Quantities are clamped to `ORDER_CONFIG` limits here as a UX guard; the
 *    Server Action re-validates everything.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  CART_STORAGE_KEY,
  calculateTotals,
  clampQuantity,
  createCartLine,
  type CartLineDisplay,
} from "@/lib/cart";
import type { CartLine, CartLineInput, OrderMode, OrderPricing } from "@/types/order";

interface CartState {
  lines: CartLine[];
}

type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: CartLine }
  | { type: "remove"; key: string }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "clear" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines };

    case "add": {
      const existing = state.lines.find((line) => line.key === action.line.key);
      if (!existing) {
        return { lines: [...state.lines, action.line] };
      }
      return {
        lines: state.lines.map((line) =>
          line.key === action.line.key
            ? {
                ...line,
                quantity: clampQuantity(line.quantity + action.line.quantity),
              }
            : line,
        ),
      };
    }

    case "remove":
      return { lines: state.lines.filter((line) => line.key !== action.key) };

    case "setQuantity":
      return {
        lines: state.lines.map((line) =>
          line.key === action.key
            ? { ...line, quantity: clampQuantity(action.quantity) }
            : line,
        ),
      };

    case "clear":
      return { lines: [] };

    default:
      return state;
  }
}

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  /** True once localStorage has been merged in (post-hydration). */
  hydrated: boolean;
  /** Subtotal + delivery fee for the given fulfilment mode. */
  totalsFor: (mode: OrderMode) => OrderPricing;
  subtotalCents: number;
  addLine: (input: CartLineInput, display: CartLineDisplay) => void;
  removeLine: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  /** Screen-reader announcement text (`aria-live="polite"`). */
  announcement: string;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Hydration marker — see `CartProvider`. Constant identities keep
 * `useSyncExternalStore` stable across renders.
 */
const noopSubscribe = () => () => {};
const alwaysTrue = () => true;
const alwaysFalse = () => false;

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.key === "string" &&
    typeof line.itemId === "string" &&
    typeof line.quantity === "number" &&
    typeof line.unitPriceCents === "number" &&
    Array.isArray(line.modifierIds) &&
    Array.isArray(line.modifierLabels)
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { lines: [] });
  /*
   * `hydrated` flags the post-hydration render so the sticky bar can show the
   * restored basket total. Implemented with `useSyncExternalStore` (server
   * snapshot = false, client snapshot = true): React flips it right after
   * hydration with **no setState-in-effect** and no SSR/CSR text mismatch.
   */
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    alwaysTrue,
    alwaysFalse,
  );
  const [isCartOpen, setCartOpen] = useState(false);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  /* Restore the persisted basket after mount (dispatch, not setState). */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dispatch({ type: "hydrate", lines: parsed.filter(isCartLine) });
        }
      }
    } catch {
      // Corrupt or unavailable storage (private mode) — start with an empty cart.
    }
  }, []);

  /* Persist on every change once hydrated. */
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      // Storage full/blocked — the cart still works for this session.
    }
  }, [state.lines, hydrated]);

  const value = useMemo<CartContextValue>(() => {
    const totalsFor = (mode: OrderMode) => calculateTotals(state.lines, mode);

    return {
      lines: state.lines,
      itemCount: state.lines.reduce((sum, line) => sum + line.quantity, 0),
      hydrated,
      totalsFor,
      subtotalCents: state.lines.reduce(
        (sum, line) => sum + line.unitPriceCents * line.quantity,
        0,
      ),
      addLine: (input, display) => {
        const line = createCartLine(
          { ...input, quantity: clampQuantity(input.quantity) },
          display,
        );
        dispatch({ type: "add", line });
        setAnnouncement(
          `U shtua në shportë: ${line.name}, ${line.quantity} copë.`,
        );
      },
      removeLine: (key) => dispatch({ type: "remove", key }),
      setQuantity: (key, quantity) =>
        dispatch({ type: "setQuantity", key, quantity }),
      clearCart: () => {
        dispatch({ type: "clear" });
        setAnnouncement("Shporta u zbraz.");
      },
      isCartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      isCheckoutOpen,
      openCheckout: () => {
        setCartOpen(false);
        setCheckoutOpen(true);
      },
      closeCheckout: () => setCheckoutOpen(false),
      announcement,
    };
  }, [state.lines, hydrated, isCartOpen, isCheckoutOpen, announcement]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart duhet të përdoret brenda <CartProvider>.");
  }
  return context;
}