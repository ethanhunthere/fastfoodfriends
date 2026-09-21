"use client";

/**
 * Accessible dialog shell used by the cart sheet and the checkout modal.
 *
 * Implements the bits that matter for real users on real phones:
 *   - `role="dialog" aria-modal="true"` + `aria-labelledby`
 *   - Escape to close, backdrop tap to close
 *   - focus moved into the panel on open and restored to the trigger on close
 *   - a simple Tab focus trap so screen-reader/keyboard users cannot tab behind
 *   - background scroll lock (without a layout jump)
 */
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "summary",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** id used by `aria-labelledby`; auto-derived if omitted. */
  titleId?: string;
  children: ReactNode;
  /** Optional sticky footer (totals + primary action). */
  footer?: ReactNode;
  /** Sheet (bottom-anchored) is the mobile default; `center` for wide screens. */
  variant?: "sheet" | "center";
}

export function Modal({
  open,
  onClose,
  title,
  titleId = "modal-title",
  children,
  footer,
  variant = "sheet",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const { overflow, paddingRight } = document.body.style;
    const stableGutter = getComputedStyle(document.documentElement).scrollbarGutter.includes("stable");
    const scrollbarWidth = stableGutter ? 0 : window.innerWidth - document.documentElement.clientWidth;
    const shell = document.getElementById("storefront-shell");
    const wasInert = shell?.inert ?? false;
    if (shell) shell.inert = true;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel)?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null || element === panelRef.current);

      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current.focus({ preventScroll: true });
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (shell) shell.inert = wasInert;
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay">
      {/* Backdrop: a real button so it is reachable by keyboard/AT. */}
      <button
        type="button"
        aria-label="Mbyll dritaren"
        onClick={onClose}
        tabIndex={-1}
        className="modal-backdrop"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-variant={variant}
        className="express-dialog"
      >
        <header className="modal-heading">
          <h2
            id={titleId}
            className="font-display text-lg font-semibold tracking-tight text-cream-50"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-charcoal-700 text-cream-200 transition-colors hover:border-flame-400 hover:text-flame-700"
          >
            <X aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Mbyll</span>
          </button>
        </header>

        <div className="modal-content">{children}</div>

        {footer ? (
          <footer className="modal-footer">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>, document.body
  );
}