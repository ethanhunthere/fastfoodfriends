import { Clock, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { getOpeningStatus } from "@/lib/hours";
import { RESTAURANT } from "@/lib/restaurant";
import { MenuSectionList } from "@/components/MenuSectionList";
import { DesktopCart } from "@/components/DesktopCart";

/** Shared, server-rendered entry point: no marketing detour before the food. */
export function ExpressMenuPage() {
  const status = getOpeningStatus();
  return (
    <>
      <section className="express-welcome" aria-labelledby="express-title">
        <div className="express-welcome-content">
          <div className="express-welcome-badge">
            <span className="express-eyebrow">GOOD FOOD • GOOD FRIENDS</span>
          </div>
          <h1 id="express-title">Uria s’pret<span>.</span></h1>
          <p>E freskët nga zgara, e përgatitur me dashuri në Pejë.</p>
        </div>
      </section>
      <div className="express-service">
        <span className={`express-service-item ${status.isOpen ? "express-open" : "express-closed"}`}>
          <span className="express-status-label">{status.isOpen ? "HAPUR TANI" : "MBYLLUR"}</span>
        </span>
        <span className="express-service-item">
          <Clock size={13} aria-hidden="true" />
          <span>25–40 min</span>
        </span>
        <Link href="/kontakt" className="express-service-item express-service-link">
          <span>{RESTAURANT.address.city}</span>
          <ArrowUpRight size={13} aria-hidden="true" />
        </Link>
      </div>
      {!status.isOpen && <p className="express-closed-note">{status.detail}. Porosit tani; konfirmojmë sapo hapim.</p>}
      <div className="storefront-layout">
        <div id="menu-browse"><MenuSectionList /></div>
        <DesktopCart />
      </div>
    </>
  );
}
