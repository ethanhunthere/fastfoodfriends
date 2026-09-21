import { Clock, MapPin, Phone, Send } from "lucide-react";
import { DAY_LABELS_SHORT_SQ, type HoursRow } from "@/lib/hours";
import { MAPS_URL, RESTAURANT, getFormattedAddress, getRestaurantPhoneHref } from "@/lib/restaurant";

/**
 * Weekly opening-hours table (server component).
 *
 * Rendered as a definition-list-ish `<table>` with a caption so screen readers
 * announce it properly; the current day gets `aria-current="date"`.
 */
export function HoursTable({ rows }: { rows: readonly HoursRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">
        Orari i hapjes së {RESTAURANT.name} sipas ditëve të javës
      </caption>
      <thead>
        <tr className="text-left text-xs font-semibold tracking-wide text-cream-200 uppercase">
          <th scope="col" className="py-2 pr-2">
            Dita
          </th>
          <th scope="col" className="py-2">
            Orari
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.weekday}
            aria-current={row.isToday ? "date" : undefined}
            className="border-t border-charcoal-800"
          >
            <th
              scope="row"
              className={`py-2 pr-2 text-left font-medium ${
                row.isToday ? "text-flame-700" : "text-cream-100"
              }`}
            >
              <span className="sm:hidden">{DAY_LABELS_SHORT_SQ[row.weekday]}</span>
              <span className="hidden sm:inline">{row.label}</span>
              {row.isToday ? (
                <span className="ml-2 rounded-pill bg-flame-500/15 px-2 py-0.5 text-xs text-flame-700">
                  sot
                </span>
              ) : null}
            </th>
            <td className="tnum py-2 text-cream-200">{row.hoursLabel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Contact / NAP block — name, address, phone are also the exact strings used in
 * the `FastFoodRestaurant` JSON-LD, which is what local SEO consistency needs.
 */
export function ContactCard() {
  return (
    <div className="rounded-card border border-charcoal-800 bg-charcoal-900 p-5">
      <h3 className="font-display text-lg font-semibold text-cream-50">
        {RESTAURANT.name}
      </h3>

      <address className="mt-3 space-y-3 text-sm not-italic text-cream-200">
        <p className="flex items-start gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-flame-700" />
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-charcoal-600 underline-offset-4 hover:text-flame-700"
            aria-label={`Hape në Maps — ${RESTAURANT.address.street}, ${RESTAURANT.address.city}`}
          >
            {getFormattedAddress()}
          </a>
        </p>
        <p className="flex items-start gap-2 text-xs text-cream-200">
          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-flame-700" />
          <span>{RESTAURANT.landmarks}</span>
        </p>
        <p className="flex items-center gap-2">
          <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-flame-700" />
          <a
            href={getRestaurantPhoneHref()}
            className="tnum underline decoration-charcoal-600 underline-offset-4 hover:text-flame-700"
          >
            {RESTAURANT.phoneE164}
          </a>
        </p>
        <p className="flex items-center gap-2">
          <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-flame-700" />
          <span>Dorëzim brenda 5 km · 25–40 min</span>
        </p>
        <p className="flex items-center gap-2">
          <Send aria-hidden="true" className="h-4 w-4 shrink-0 text-flame-700" />
          <a
            href={`mailto:${RESTAURANT.email}`}
            className="underline decoration-charcoal-600 underline-offset-4 hover:text-flame-700"
          >
            {RESTAURANT.email}
          </a>
        </p>
      </address>

      <p className="mt-4 rounded-xl bg-charcoal-850 p-3 text-xs text-cream-200">
        Porositë konfirmohen me telefon ose në WhatsApp brenda pak minutash.
        Për porosi të mëdha (mbi 10 persona) të lutem telefono drejtpërdrejt.
      </p>
    </div>
  );
}