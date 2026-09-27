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
        {/* Official emblem, full quality: a lossless PNG density ladder cut from
            the 4K badge master (48/96/144/192 = DPR 1–4) — disc ground removed,
            only the burger and its FRIENDS wordmark. Deliberately a plain <img>:
            next/image re-encodes through its optimizer (VP8/AV1 mandate 4:2:0
            chroma), which measurably degrades the emblem's saturated gold.
            Each DPR slot downloads only what its screen needs. */}
        <span className="express-logo" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- deliberate: next/image's
              optimizer would re-encode this losslessly-authored asset (WebP VP8 forces
              4:2:0 chroma, measured 22 dB chroma loss on the badge's gold). */}
          <img
            src="/fastfoodfriendslogo-v2-144.png"
            srcSet="/fastfoodfriendslogo-v2-48.png 1x, /fastfoodfriendslogo-v2-96.png 2x, /fastfoodfriendslogo-v2-144.png 3x, /fastfoodfriendslogo-v2-192.png 4x"
            alt=""
            width={53}
            height={48}
            fetchPriority="high"
            decoding="async"
          />
        </span>
        <span className="express-wordmark">
          <strong>Fast Food</strong>
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
