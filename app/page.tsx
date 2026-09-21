import { ExpressMenuPage } from "@/components/ExpressMenuPage";
import { buildPageMetadata } from "@/lib/seo";
import { RESTAURANT, ORDER_CONFIG } from "@/lib/restaurant";

export const revalidate = 300;
export const runtime = "nodejs";
export const metadata = buildPageMetadata({
  title: "Zgjidh. Personalizo. Shijo.",
  description: `Hamburger, hotdog, tost, pomfrit dhe pije — ${RESTAURANT.address.street}, ${RESTAURANT.address.city}, ${RESTAURANT.landmarkShort.toLowerCase()}. Porosit online, marrim brenda ${ORDER_CONFIG.etaMinutes.min}–${ORDER_CONFIG.etaMinutes.max} min.`,
  path: "/",
});
export default function Page() { return <ExpressMenuPage />; }
