/**
 * OpenGraph social image (1200×630). Rendered with `next/og`'s `ImageResponse`
 * — no external HTTP request and no client JS shipped to visitors; crawlers
 * fetch it only when a link is shared.
 *
 * System font only (no Google Fonts fetch while rendering → faster + robust).
 */
import { ImageResponse } from "next/og";
import { RESTAURANT } from "@/lib/restaurant";

export const runtime = "nodejs";
export const alt = `Menuja e ${RESTAURANT.name} — hamburger, hotdog, tost & pomfrit`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          /* Flat, appetite-focused matte field — no ambient gradient mesh. The
             food emojis carry the color; the deep ink ground is a printed-menu
             backdrop, not a glow. */
          background: "#0b0a08",
          color: "#fff7ec",
          fontFamily:
            "Rokkitt, Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ fontSize: 64, lineHeight: 1, display: "flex" }}>
          🍔🍟🌭🥤
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 44, fontWeight: 700 }}>Fast Food Friends</div>
          <div style={{ fontSize: 22, opacity: 0.9 }}>
            Hamburger · Hotdog · Tost · Pomfrit · Pije
          </div>
          <div style={{ fontSize: 18, opacity: 0.8 }}>
            {`Porosit dhe konfirmo me telefon · ${RESTAURANT.address.city}`}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
