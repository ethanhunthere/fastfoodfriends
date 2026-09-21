import Link from "next/link";

import { Clock } from "lucide-react";
import type { OpeningStatus } from "@/lib/hours";

/**
 * Operating-hours UI — all server-rendered (zero client JS, zero CLS).
 *
 * Layout note: the wrapper always occupies the same height (`min-h-16`) whether
 * the store is open or closed, so the badge ↔ banner swap after an ISR
 * revalidation never shifts the content below it (CLS = 0).
 */

export function OpeningStatusBadge({
  status,
  className = "",
}: {
  status: OpeningStatus;
  className?: string;
}) {
  const isOpen = status.isOpen;

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium ${
        isOpen
          ? "border-open-500/40 bg-open-500/10 text-open-400"
          : "border-flame-500/40 bg-flame-500/10 text-flame-300"
      } ${className}`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span
          className={`h-2 w-2 rounded-full ${
            isOpen ? "bg-open-400" : "bg-flame-400"
          }`}
        />
      </span>
      <span>{status.label}</span>
      {status.detail ? (
        <span className="text-cream-200">· {status.detail}</span>
      ) : null}
    </span>
  );
}

export function ClosedBanner({ status }: { status: OpeningStatus }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-card border border-flame-500/40 bg-flame-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-flame-300" />
        <div>
          <p className="font-semibold text-flame-300">
            Mbyllur tani — {status.detail}
          </p>
          <p className="text-sm text-cream-200">
            Mund të dërgosh porosinë gjithsesi; e konfirmojmë sapo hapim.
          </p>
        </div>
      </div>

      <Link
        href="/menu"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-flame-500 px-4 text-sm font-semibold text-white hover:bg-flame-700"
      >
        Shiko menunë
      </Link>
    </div>
  );
}

/**
 * Always-rendered hour panel: green badge when open, red banner when closed.
 * Used on the home page hero and on the contact section.
 */
export function OpeningStatusPanel({
  status,
  showClosedBanner = true,
}: {
  status: OpeningStatus;
  showClosedBanner?: boolean;
}) {
  return (
    <div className="min-h-16" aria-live="polite">
      {status.isOpen ? (
        <div className="flex flex-wrap items-center gap-3">
          <OpeningStatusBadge status={status} />
      <Link
        href="/#menu-browse"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-charcoal-700 px-4 text-sm font-medium text-cream-100 transition-colors hover:border-flame-500 hover:text-flame-700"
      >
        Porosit online
      </Link>
        </div>
      ) : showClosedBanner ? (
        <ClosedBanner status={status} />
      ) : null}
    </div>
  );
}