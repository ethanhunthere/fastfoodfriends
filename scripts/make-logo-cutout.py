#!/usr/bin/env python3
"""
Build the navbar logo: burger + "FRIENDS" wordmark only, on transparency.

Source of truth is the official badge (assets/logo/fastfoodfriendslogo-4k.jpg).
Masters live outside public/ so they are never served or deployed; only the
DPR ladder lands in public/.
The badge places the burger on a near-black painterly disc with a warm glow,
a "FAST FOOD" sub-line and side dashes — none of which belong on paper.

Extraction pipeline (4096px master):
  1. radial cut       — hard stop at r=1895 (past the disc's outer grain).
  2. content model    — bright artwork pixels only (max RGB >= 140). The ground
                        glow tops out ≈125, the patty ≈90: neither qualifies.
  3. silhouette       — per-row span of the content, padded 45px past the
                        outlines, plus a 45px 2D halo (outlines live *around*
                        their fill colour, above/below the row logic).
                        Crucially, rows with NO content (the gaps above/below
                        the burger) contribute nothing — this severs the bridge
                        to the sub-line.
  4. hole fill        — the patty shares the ground's colour, but it is fully
                        enclosed by cheese/bun/outline: holes come back in.
  5. components       — keep the burger component (seeded on the lettuce) plus
                        strays within 60px (wordmark fragments) that do not hang
                        below the bun. The "FAST FOOD" band's tallest arcs clear
                        the bun by only ~26px — inside the prox radius — so the
                        below-bun guard is what severs it; the side dashes fail
                        both conditions.
  6. feather + ladder — 2px alpha feather, then premultiplied RGBA downscale to
                        48/96/144/192 (DPR 1-4) so transparent pixels cannot
                        bleed dark colour into the edges.

The dark band *behind* the FRIENDS letters is kept deliberately: the letters
are cream with no outline — without their dark waist they would vanish on the
paper navbar. That band is part of the burger emblem, not the badge ground.

Run:  python3 scripts/make-logo-cutout.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "assets" / "logo"     # working files — never served
SRC = MASTERS / "fastfoodfriendslogo-4k.jpg"
OUT = ROOT / "public"                  # only the DPR ladder ships
LADDER = (48, 96, 144, 192)   # heights in CSS px × DPR 1..4
R_KEEP = 1895                  # outer grain of the disc dies here
CONTENT_MIN = 140              # ground glow maxes at ≈125; artwork starts ≈140
N_PX = 45                      # halo: covers the black outline around fills
SPAN_PAD = 45                  # per-row pad, same reason (horizontal outlines)
PROX_PX = 60                   # wordmark strays may hug the burger…
SEED = (2048, 2100)            # (x, y) — guaranteed inside the lettuce


def resize_premult(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    """LANCZOS-resize RGBA without letting transparent pixels tint edges."""
    arr = np.asarray(im, dtype=np.float64)
    a = arr[..., 3:4] / 255.0
    prem = np.concatenate([arr[..., :3] * a, arr[..., 3:4]], axis=2)
    out = np.asarray(
        Image.fromarray(prem.astype(np.uint8), "RGBA").resize(size, Image.LANCZOS),
        dtype=np.float64,
    )
    oa = out[..., 3:4] / 255.0
    with np.errstate(divide="ignore", invalid="ignore"):
        rgb = np.where(oa > 0, out[..., :3] / np.maximum(oa, 1e-6), 0)
    rgb = np.clip(rgb, 0, 255)
    return Image.fromarray(
        np.concatenate([rgb, out[..., 3:4]], axis=2).astype(np.uint8), "RGBA"
    )

def main() -> int:
    src = Image.open(SRC).convert("RGB")
    w, h = src.size
    if (w, h) != (4096, 4096):
        raise SystemExit(f"expected 4096² master, got {w}x{h}")
    rgb = np.asarray(src)

    # 1 — radial cut: kill the disc's outer grain and any edge ring
    yy, xx = np.mgrid[0:h, 0:w]
    rr = np.hypot(xx - w // 2, yy - h // 2)
    radial = np.clip((R_KEEP - rr) / 3.0, 0.0, 1.0)

    # 2 — content: bright artwork (the ground glow never reaches 140)
    content = (rgb.max(axis=2) >= CONTENT_MIN) & (radial > 0)

    # 3 — silhouette: per-row content span (padded over horizontal outlines)
    cols = np.arange(w)
    has = content.any(axis=1)
    left = np.argmax(content, axis=1)
    right = w - 1 - np.argmax(content[:, ::-1], axis=1)
    span = np.zeros((h, w), dtype=bool)
    rows = np.where(has)[0]
    span[rows] = (cols[None, :] >= (left[rows] - SPAN_PAD)[:, None]) & (
        cols[None, :] <= (right[rows] + SPAN_PAD)[:, None]
    )
    near = ndimage.distance_transform_edt(~content) <= N_PX
    base = content | span | near

    # 4 — hole fill: the patty is ground-coloured but enclosed by artwork
    base = ndimage.binary_fill_holes(base)

    # 5 — keep the burger component + near strays; the sub-line's band is
    #      severed by the empty rows above/below the burger, so it drops out.
    #      A stray may hug the burger horizontally (wordmark swashes) but must
    #      not hang below the bun: "FAST FOOD"'s tallest arcs clear the bun by
    #      only ~26px, inside PROX_PX, and would leave a pip trail if kept.
    labels, n_labels = ndimage.label(base)
    seed_label = labels[SEED[1], SEED[0]]
    if seed_label == 0:
        raise SystemExit("seed landed off-artwork — pick a new SEED")
    burger = labels == seed_label
    bun_bottom = int(np.where(burger)[0].max())
    dist = ndimage.distance_transform_edt(~burger)
    keep = burger.copy()
    dropped_boxes: list[str] = []
    for i in range(1, n_labels + 1):
        if i == seed_label:
            continue
        comp = labels == i
        ys, xs = np.where(comp)
        if dist[comp].min() <= PROX_PX and ys.min() <= bun_bottom:
            keep |= comp
            continue
        if len(ys) >= 1500:
            dropped_boxes.append(
                f"  dropped: area={len(ys)} bbox=({xs.min()},{ys.min()})-"
                f"({xs.max()},{ys.max()})"
            )
    for line in dropped_boxes[:3]:
        print(line)
    kept = int(np.unique(labels[keep]).size)
    print(f"components kept: {kept} (incl. the burger)  dropped: {n_labels - kept}")

    # 6 — feather the alpha, then re-apply the soft radial edge
    alpha = Image.fromarray((keep * 255).astype(np.uint8), "L")
    alpha = np.asarray(alpha.filter(ImageFilter.GaussianBlur(2.0)), dtype=np.float64)
    alpha = np.where(alpha >= 127, 255, 0)            # crisp, jaggie-free
    alpha = np.minimum(alpha, radial * 255.0)         # edge stays soft
    out = Image.fromarray(np.dstack([rgb, alpha.astype(np.uint8)]), "RGBA")

    ys, xs = np.where(alpha > 0)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    print(f"bbox: ({x0},{y0})-({x1},{y1})  {bw}x{bh}  aspect w/h={bw/bh:.3f}")

    # master + DPR ladder (premultiplied resample)
    out.save(MASTERS / "fastfoodfriendslogo-cutout.png", optimize=True)
    aspect = bw / bh
    cropped = out.crop((x0, y0, x1 + 1, y1 + 1))
    for target in LADDER:
        tw = max(1, round(target * aspect))
        resized = resize_premult(cropped, (tw, target))
        path = OUT / f"fastfoodfriendslogo-{target}.png"
        resized.save(path, optimize=True)
        print(f"ladder: {path.name} {tw}x{target} {path.stat().st_size // 1024}KB")

    for name, bg in (("paper", (253, 245, 226)), ("ink", (25, 16, 8))):
        preview = Image.new("RGB", (900, 900), bg)
        badge = out.resize((860, 860), Image.LANCZOS)
        preview.paste(badge, (20, 20), badge)
        preview.save(f"/tmp/cutout-{name}.png")
    print("previews: /tmp/cutout-paper.png /tmp/cutout-ink.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())

