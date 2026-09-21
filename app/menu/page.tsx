import { ExpressMenuPage } from "@/components/ExpressMenuPage";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 300;
export const runtime = "nodejs";
export const metadata = buildPageMetadata({
  title: "Zgjidh. Personalizo. Shijo.",
  description: "Hamburger, hotdog, tost, pomfrit dhe pije. Porosit online, shpejt dhe thjesht.",
  path: "/menu",
});
export default function Page() { return <ExpressMenuPage />; }
