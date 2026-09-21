# 🍔 FastFoodFriends

Ultra-fast, mobile-first fast food ordering PWA built with **Next.js 16 (App Router)**, **Tailwind CSS v4** and **Lucide React**. Optimized for **100/100 Core Web Vitals on mobile** — server-rendered menu, zero unnecessary client JavaScript, and a **Direct Call-to-Confirm** ordering flow that pushes orders straight to the store manager's phone via **ntfy.sh**.

---

## ✨ Features

| Area | Implementation |
| --- | --- |
| **Ordering** | Cart → Checkout → Next.js **Server Action** → urgent ntfy.sh push with `tel:+383…` click-to-dial action button |
| **Menu** | 11 items across 3 categories (Ushqime Kryesore / Shtesa / Pije), variants + quick modifiers (pa qepë, ekstra majonez, keqap, sallatë…) |
| **Hours engine** | Dynamic **Hapur Tani** (green) / **Mbyllur** (red + next opening) badges, computed on the server with ISR revalidation |
| **Checkout validation** | Kosovo mobile prefixes (`044 / 045 / 049 / 043 / 048`), required name/address, min. order, delivery vs. pickup — validated client-side **and** again inside the Server Action |
| **SEO** | Full JSON-LD (`FastFoodRestaurant`, `OpeningHoursSpecification`, `Menu`/`HasMenuItem`), dynamic metadata, OpenGraph image, `sitemap.xml`, `robots.txt`, `manifest.webmanifest` |
| **Performance** | Static/SSG + ISR pages, RSC-first (client JS only in the cart shell), inline SVG icon, no layout shift (CLS ≈ 0), self-hosted zero-font stack |
| **Accessibility** | Semantic landmarks, skip-link, ARIA on modals/badges, keyboard-navigable cart & checkout |

---

## 🚀 Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

Useful scripts:

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

### Environment

Copy `.env.example` → `.env.local` and adjust:

```ini
# Public site URL (used for metadata, sitemap, JSON-LD)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ntfy.sh topic the manager subscribes to — keep it secret & unguessable!
NTFY_TOPIC=fastfoodfriends-orders-CHANGE-ME

# Optional: self-hosted ntfy instance
NTFY_SERVER=https://ntfy.sh

# Restaurant contact (used across UI + schema.org)
NEXT_PUBLIC_PHONE=+38344123456
```

> **Security note:** anyone who knows the ntfy topic can read the order feed. Use a long random topic name, or self-host ntfy with auth.

---

## 📲 Manager setup (receiving orders)

1. Install the **ntfy app** ([Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / iOS) on the store phone.
2. Subscribe to the topic set in `NTFY_TOPIC`.
3. Set notification priority to max so orders arrive with sound/vibration.
4. Every order push includes a **“Telefono”** action button that dials the customer directly (`tel:+383…`) — one tap to confirm.

Order notification looks like:

```
🍽️ POROSI E RE — 12,50 €
──────
Arben Krasniqi · 044 123 456
Rr. Agim Ramadani 15, Prishtinë

• 2× Hamburger Tradicional (Me ve)
    + pa qepë, ekstra majonez
• 1× Pomfrit (Madhësia e madhe)
• 2× Coca-Cola (0.5L)

Shënime: Pa salcë të picantë, ju lutem
────────
Lloji: Sherbim me dërgesë · Totali: 12,50 €
[ 🔗 Telefono ]  ← tel:+38344123456
```

---
