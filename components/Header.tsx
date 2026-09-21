import Link from "next/link";
import { MapPin } from "lucide-react";
import { HeaderCartButton } from "@/components/HeaderCartButton";
import { RESTAURANT } from "@/lib/restaurant";
import { getOpeningStatus } from "@/lib/hours";

/** Authoritative sticky brand anchor: identity · live status · location · cart. */
export function Header() {
  const status = getOpeningStatus();
  return <header className="express-header">
    <div className="express-header-inner">
      <Link href="/" className="express-brand" aria-label={`${RESTAURANT.name} — ballina`}>
        <span className="express-logo" aria-hidden="true">ff<span>•</span></span>
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
