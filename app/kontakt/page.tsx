import { Clock, MapPin } from "lucide-react";
import { ContactCard, HoursTable } from "@/components/HoursTable";
import { OpeningStatusPanel } from "@/components/OpeningStatus";
import { getOpeningStatus, getWeeklyHoursRows } from "@/lib/hours";
import mapPin from "@/lib/map-pin.json";
import {
  MAPS_URL,
  RESTAURANT,
  getRestaurantPhoneHref,
} from "@/lib/restaurant";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300; // = HOURS_REVALIDATE_SECONDS (must be a literal for Next)
export const runtime = "nodejs";

export const metadata = buildPageMetadata({
  title: "Kontakt — Fast Food Friends",
  description: `${RESTAURANT.name} në ${RESTAURANT.address.street}, ${RESTAURANT.address.city} — ${RESTAURANT.landmarks}. Telefono ${RESTAURANT.phoneE164} për porosi.`,
  path: "/kontakt",
});

export default function ContactPage() {
  const status = getOpeningStatus();
  const hoursRows = getWeeklyHoursRows();

  return (
    <section className="contact-page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-cream-50 sm:text-4xl">
          Kontakt
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-cream-200">
          Ne jemi në {RESTAURANT.address.street} ({RESTAURANT.address.neighborhood}),
          {RESTAURANT.address.city} — {RESTAURANT.landmarks}. Telefono për
          porosi, pyetje mbi menujën ose të gjeje rrugën në lokal.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-5">
        <div className="space-y-6 md:col-span-2">
          <div className="min-h-16">
            <OpeningStatusPanel status={status} />
          </div>

          <ContactCard />
        </div>

        <div className="md:col-span-3">
          {/* Locally baked map (scripts/bake-map.cjs) — the old third-party
              static-map endpoint was retired, so this ships from our origin:
              no external request, no API key, and the box is sized up front. */}
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Hap lokacionin e ${RESTAURANT.name} në Google Maps`}
            className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-500"
          >
            <figure className="relative aspect-[2/1] w-full overflow-hidden rounded-card border border-charcoal-800">
              {/* Pre-baked 1x/2x WebP from scripts/bake-map.cjs — served from
                  our own origin with immutable caching, so the map paints
                  without a third-party round trip. */}
              <picture>
                <source
                  type="image/webp"
                  srcSet="/location/peja-720.webp 720w, /location/peja-1440.webp 1440w"
                  sizes="(min-width: 768px) 60vw, 100vw"
                />
                <img
                  src="/location/peja-720.webp"
                  alt={`Harta e ${RESTAURANT.address.street} në ${RESTAURANT.address.city}, ${RESTAURANT.landmarks}`}
                  width={720}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </picture>

              {/* Pin drawn in CSS from the baked coordinates — stays sharp at
                  any density and never needs re-cutting if the pin moves. */}
              <span
                aria-hidden="true"
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${mapPin.x * 100}%`, top: `${mapPin.y * 100}%` }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-charcoal-900 bg-flame-500 shadow-[0_2px_0_rgb(0_0_0/0.25)]" />
              </span>
              <span
                aria-hidden="true"
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-charcoal-600/70 bg-charcoal-950/92 px-2 py-1 text-[11px] font-bold text-cream-50"
              >
                <MapPin size={12} aria-hidden="true" className="text-flame-500" />
                {RESTAURANT.name}
              </span>

              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-charcoal-950/78 px-3 py-1.5 text-[10px] text-cream-200">
                <span>© OpenStreetMap</span>
                <span className="font-bold text-flame-700">Hape në Maps →</span>
              </figcaption>
            </figure>
          </a>
          <p className="mt-2 text-xs text-cream-200">
            {RESTAURANT.landmarks} —{" "}
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-charcoal-600 underline-offset-4 hover:text-flame-700"
            >
              Hape në Maps
            </a>
            .
          </p>
        </div>
      </div>

      <div className="mt-10">
        <section aria-labelledby="hours-heading">
          <h2 id="hours-heading" className="font-display text-2xl font-bold text-cream-50">
            Orari i hapjes
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-cream-200">
            {RESTAURANT.name} — koha lokale në {RESTAURANT.address.city}.
          </p>

          <HoursTable rows={hoursRows} />
          <p className="mt-3 text-xs text-cream-200">
            <Clock aria-hidden="true" className="inline h-4 w-4 text-flame-700" />{" "}
            Telefono për porosi edhe në ekstremitetet e koheve:{" "}
            <a
              href={getRestaurantPhoneHref()}
              className="tnum underline decoration-charcoal-600 underline-offset-4 hover:text-flame-700"
            >
              {RESTAURANT.phoneE164}
            </a>
          </p>
        </section>
      </div>
    </section>
  );
}
