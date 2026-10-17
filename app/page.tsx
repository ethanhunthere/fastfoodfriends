import { ExpressMenuPage } from "@/components/ExpressMenuPage";
import { buildPageMetadata } from "@/lib/seo";
import { RESTAURANT, ORDER_CONFIG } from "@/lib/restaurant";

export const revalidate = 300;
export const runtime = "nodejs";
export const metadata = buildPageMetadata({
  title: "Porosi Fast Food në Pejë — Hamburger, Hotdog & Pomfrit",
  description: `Fast Food Friends në Pejë: Hamburger, chickenburger, tosta dhe pomfrit të freskëta. Porosit online, marrim brenda ${ORDER_CONFIG.etaMinutes.min}–${ORDER_CONFIG.etaMinutes.max} min.`,
  path: "/",
});
export default function Page() { return <ExpressMenuPage />; }
