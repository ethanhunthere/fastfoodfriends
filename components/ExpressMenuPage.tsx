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
        <div>
          <p className="express-eyebrow">GOOD FOOD. GOOD FRIENDS.</p>
          <h1 id="express-title">Uria s’pret<span>.</span></h1>
          <p>Zgjidh të preferuarën. Ne kujdesemi për pjesën tjetër.</p>
        </div>
      </section>
      <div className="express-service">
        <span className={status.isOpen ? "express-open" : "express-closed"}>
          {status.isOpen ? "Hapur tani" : "Mbyllur"}
        </span>
        <span><Clock size={13} aria-hidden="true" />25–40 min</span>
        <Link href="/kontakt">{RESTAURANT.address.city} <ArrowUpRight size={13} aria-hidden="true" /></Link>
      </div>
      {!status.isOpen && <p className="express-closed-note">{status.detail}. Porosit tani; konfirmojmë sapo hapim.</p>}
      <div className="storefront-layout">
        <div id="menu-browse"><MenuSectionList /></div>
        <DesktopCart />
      </div>
    </>
  );
}
