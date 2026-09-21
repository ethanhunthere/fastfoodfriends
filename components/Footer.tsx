import Link from "next/link";
import { MAPS_URL, RESTAURANT, getRestaurantPhoneHref } from "@/lib/restaurant";
export function Footer() {
  return <footer className="express-footer">
    <span>Me shije. Me miq. <strong>ff.</strong></span>
    <nav aria-label="Informacioni i lokalit"><Link href="/kontakt">Orari & lokacioni</Link><a href={getRestaurantPhoneHref()}>Kontakt</a></nav>
    <address>
      {RESTAURANT.address.street}, {RESTAURANT.address.city} · {RESTAURANT.landmarks}{" "}
      <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">Hape në Maps</a>
    </address>
  </footer>;
}
