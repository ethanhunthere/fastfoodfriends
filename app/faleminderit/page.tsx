import Link from "next/link";
import { Phone } from "lucide-react";
import { RESTAURANT, getRestaurantPhoneHref } from "@/lib/restaurant";
import { buildPageMetadata } from "@/lib/seo";

/**
 * Lightweight "order received" page (noindex via metadata). After a successful
 * Server Action submit the confirmation is shown inline in the modal; this route
 * is a shareable/refresh-friendly fallback that also re-exposes the store phone.
 */
export const metadata = buildPageMetadata({
  title: "Porosia u dërgua — Fast Food Friends",
  description: "Porosia jeteu dërguar. Ne të telefonojmë brenda pak minutash.",
  path: "/faleminderit",
  noIndex: true,
});

export default function ThankYouPage() {
  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 text-center">
      <span
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-full bg-open-500/10 text-5xl"
      >
        ✅
      </span>

      <h1 className="font-display text-2xl font-bold text-cream-50 sm:text-3xl">
        Faleminderit! Porosia u dërgua.
      </h1>

      <p className="max-w-md text-sm text-cream-200">
        Pikës ka arritur njoftimi push me butonin “Telefono”. Brenda pak
        minutrash do të bëjmë një thirrje për të konfirmuar porosinë dhe
        kohën e dorëzimit.
      </p>

      <a
        href={getRestaurantPhoneHref()}
        className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-flame-500 px-6 text-base font-semibold text-white transition-colors hover:bg-flame-700"
      >
        <Phone aria-hidden="true" className="h-5 w-5" />
        Telefono {RESTAURANT.phoneE164}
      </a>

      <Link
        href="/#menu-browse"
        className="inline-flex min-h-11 items-center text-sm font-medium text-cream-200 underline decoration-charcoal-600 underline-offset-4 hover:text-flame-700"
      >
        ← Kthehu në menujë
      </Link>
    </section>
  );
}
