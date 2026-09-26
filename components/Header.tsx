import Link from "next/link";
import { MapPin } from "lucide-react";
import { HeaderCartButton } from "@/components/HeaderCartButton";
import { RESTAURANT } from "@/lib/restaurant";
import { getOpeningStatus } from "@/lib/hours";

/** Authoritative sticky brand anchor: official badge · live status · location · cart. */
export function Header() {
  const status = getOpeningStatus();
  return <header className="express-header">
    <div className="express-header-inner">
      <Link href="/" className="express-brand" aria-label={`${RESTAURANT.name} — ballina`}>
        {/* Official badge, full quality: a lossless-WebP density ladder derived
            from the 4K master (48/96/144/192 = DPR 1–4). Deliberately a plain
            <img> — next/image re-encodes through its optimizer (VP8 mandates
            4:2:0 chroma), which measurably degrades the badge's saturated gold.
            Each DPR slot downloads only what its screen needs. */}
        <span className="express-logo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- deliberate: next/image's
              optimizer would re-encode this losslessly-authored asset (WebP VP8 forces
              4:2:0 chroma, measured 22 dB chroma loss on the badge's gold ring). */}
          <img
            src="/fastfoodfriendslogo-144.webp"
            srcSet="/fastfoodfriendslogo-48.webp 1x, /fastfoodfriendslogo-96.webp 2x, /fastfoodfriendslogo-144.webp 3x, /fastfoodfriendslogo-192.webp 4x"
            alt=""
            width={48}
            height={48}
            fetchPriority="high"
            decoding="async"
          />
        </span>
        <span className="express-wordmark">
          <small>Fast Food</small>
          <strong>friends.</strong>
        </span>
      </Link>
      <div className="express-nav-mid">
        <span
          className="express-nav-status"
          data-open={status.isOpen}
          role="status"
        >
          <span className="express-nav-status-label">{status.label}</span>
          <span className="express-nav-status-detail">{status.detail}</span>
        </span>
        <span className="express-nav-divider" aria-hidden="true" />
        <Link
          href="/kontakt"
          className="express-location"
          title={`${RESTAURANT.address.street}, ${RESTAURANT.address.city} — ${RESTAURANT.landmarks}`}
        >
          <MapPin size={14} aria-hidden="true" />
          <span className="express-location-city">{RESTAURANT.address.city}</span>
          <span className="express-location-street">{RESTAURANT.address.street}</span>
        </Link>
      </div>
      <HeaderCartButton />
    </div>
  </header>;
}
