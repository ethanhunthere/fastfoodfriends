"use client";

import { useEffect, useState } from "react";
import { CircleCheckBig, Clock, Hash, X } from "lucide-react";

interface ActiveOrder {
  code: string;
  time: string;
  eta: string;
  clockTarget?: string;
  timestamp: number;
}

export function ActiveOrderBanner() {
  const [order, setOrder] = useState<ActiveOrder | null>(null);

  useEffect(() => {
    function loadOrder() {
      try {
        const raw = window.localStorage.getItem("fff_active_order");
        if (raw) {
          const parsed = JSON.parse(raw);
          // Auto-expire banner after 90 minutes
          if (Date.now() - parsed.timestamp < 90 * 60 * 1000) {
            setOrder(parsed);
            return;
          }
        }
      } catch {
        // storage disabled or corrupted
      }
      setOrder(null);
    }

    loadOrder();
    window.addEventListener("fff_order_placed", loadOrder);
    return () => window.removeEventListener("fff_order_placed", loadOrder);
  }, []);

  if (!order) return null;

  return (
    <aside
      aria-label="Porosia juaj aktive"
      className="border-b-2 border-open-400 bg-charcoal-900 px-4 py-2.5 text-cream-50 shadow-md"
    >
      <div className="storefront-container relative flex flex-col items-center justify-center gap-2 text-center text-xs sm:text-sm sm:flex-row sm:justify-between sm:text-left pr-8 sm:pr-0">
        <div className="flex items-center justify-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-open-400 opacity-75"></span>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-open-400"></span>
          </span>
          <span className="font-bold text-cream-50">Porosia po përgatitet!</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1">
          <span className="flex items-center gap-1 font-semibold text-cream-100">
            <Hash className="h-3.5 w-3.5 text-flame-700" aria-hidden="true" />
            Kodi: <strong className="font-display font-black text-flame-700">#{order.code}</strong>
          </span>

          <span className="flex items-center gap-1 font-semibold text-cream-100">
            <Clock className="h-3.5 w-3.5 text-cream-200" aria-hidden="true" />
            Ora: <strong className="text-cream-50">{order.time.replace(/\s*(m\.d\.|p\.d\.|am|pm)\.?/gi, "").trim()}</strong>
          </span>

          <span className="flex items-center gap-1 font-semibold text-cream-100">
            <span>🏍️</span>
            Koha e arritjes:{" "}
            <strong className="text-open-400">~{order.eta}</strong>
            {order.clockTarget ? (
              <span className="text-cream-200 font-medium">({order.clockTarget})</span>
            ) : null}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.removeItem("fff_active_order");
            } catch {}
            setOrder(null);
          }}
          className="absolute right-2 top-2 sm:static sm:ml-auto inline-flex items-center gap-1 p-1 text-xs font-semibold text-cream-200 transition-colors hover:text-white"
          aria-label="Mbyll njoftimin e porosisë"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
