import Link from "next/link";
import { House, Phone } from "lucide-react";
import { getRestaurantPhoneHref, RESTAURANT } from "@/lib/restaurant";

export const metadata = {
  title: "Faqja nuk u gjet — Fast Food Friends",
  description: "E kaluove një rrugë që s’ekziston. Kthehu në ballinë ose telefono.",
  robots: { index: false, follow: false },
};

export default function NotFoundPage() {
  return (
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 text-center px-4">
      <span aria-hidden="true" className="text-[72px] leading-none">
        🍔
      </span>

      <div>
        <h1 className="font-display text-2xl font-bold text-cream-50 sm:text-3xl">
          404 — Nuk u gjet
        </h1>
        <p className="mt-3 max-w-md text-sm text-cream-200">
          Faqja që kerkosh s’ekziston. Mund që të ket dhe futur një link të
          vjetër, ose një gabim e kam regjistruar.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-flame-500 px-5 text-sm font-semibold text-charcoal-900 transition-colors hover:bg-flame-400"
        >
          <House aria-hidden="true" className="h-4 w-4" />
          Ballina
        </Link>
        <a
          href={getRestaurantPhoneHref()}
          className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-charcoal-700 px-5 text-sm font-semibold text-cream-100 transition-colors hover:border-flame-500 hover:text-flame-700"
        >
          <Phone aria-hidden="true" className="h-4 w-4" />
          Telefono {RESTAURANT.phoneE164}
        </a>
      </div>
    </section>
  );
}
