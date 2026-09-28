#!/usr/bin/env python3
"""Spec-driven batch isolation + refinement for menu product photography.

Runs rembg (single, explicitly named session per model - no u2net/u2netp
drift) over a JSON manifest of items, optionally pre-cropping each raw source
so the neural matte is guided to the hero object, refines the alpha
(erode -> blur), optionally levels the subject along its principal axis, and
writes a trimmed transparent PNG master.

Usage:
    /home/f0id/.local/bin/uv run --with "rembg[cpu]" --with pillow --with numpy \
        python scripts/isolate_batch.py scripts/isolate-spec.json

Item fields (id/src/out required, rest optional):
    id       slug used for log output
    src      raw source photo, path relative to the project root
    out      transparent PNG master to write
    crop     [left, top, right, bottom] fractions of the raw frame
    trim     [l, t, r, b] fractions shaved off the finished cutout
    erode    MinFilter radius for edge fringe removal (default 2, 0 = off)
    blur     Gaussian radius for edge softening (default 0.8)
    pad      transparent padding kept around the subject bbox (default 12)
    level    rotate so the subject's principal axis sits horizontal
    keep_polygon  list of polygons, each a list of [x, y] fractions of the
                  cropped frame; alpha outside them is cleared (guided matting)
    min_component keep blobs at least this fraction of the largest blob's area
    desaturate    blend toward luminance by this fraction (0-1), global
    low_sat       strength (0-1) for neutralising faint colour casts only,
                  leaving saturated accents intact
    low_sat_cutoff saturation above which pixels are left alone (default 0.35)
    model    rembg session name (default "u2net" for every item)
    source_alpha  reuse the source PNG's own alpha instead of running rembg
                  (for shop-supplied files that are already pre-cut)

Pass item ids after the spec path to process a subset, e.g.
    ... isolate_batch.py scripts/isolate-spec.json pomfrit
"""

import json
import math
import os
import sys

import numpy as np
import rembg
from PIL import Image, ImageFile, ImageFilter

ImageFile.LOAD_TRUNCATED_IMAGES = True

MAX_INFER_DIM = 2048
_SESSIONS = {}


def session_for(name):
    if name not in _SESSIONS:
        print(f"  loading rembg session '{name}'")
        _SESSIONS[name] = rembg.new_session(name)
    return _SESSIONS[name]


def fractional_crop(img, crop):
    if not crop:
        return img
    w, h = img.size
    box = (
        int(crop[0] * w),
        int(crop[1] * h),
        int(round(crop[2] * w)),
        int(round(crop[3] * h)),
    )
    return img.crop(box)


def infer_alpha(img, model):
    """Full-resolution L-mode alpha for img, via a single shared session."""
    orig_w, orig_h = img.size
    scale = min(1.0, MAX_INFER_DIM / max(orig_w, orig_h))
    if scale < 1.0:
        work = img.resize(
            (max(1, int(orig_w * scale)), max(1, int(orig_h * scale))),
            Image.Resampling.LANCZOS,
        )
    else:
        work = img
    cutout = rembg.remove(work, session=session_for(model))
    alpha = cutout.split()[3]
    if work.size != img.size:
        alpha = alpha.resize(img.size, Image.Resampling.LANCZOS)
    return alpha


def principal_axis_deg(alpha, threshold=128):
    """Angle in degrees (image space, y down) of the alpha mass' long axis."""
    ys, xs = np.nonzero(np.asarray(alpha) > threshold)
    if xs.size < 64:
        return 0.0
    x = xs.astype(np.float64)
    y = ys.astype(np.float64)
    x -= x.mean()
    y -= y.mean()
    cov = np.array([[(x * x).mean(), (x * y).mean()], [(x * y).mean(), (y * y).mean()]])
    vals, vecs = np.linalg.eigh(cov)
    vx, vy = vecs[:, int(np.argmax(vals))]
    deg = math.degrees(math.atan2(vy, vx))
    while deg > 90:
        deg -= 180
    while deg <= -90:
        deg += 180
    return deg


def rotate_rgba(img, deg):
    """Rotate colour and alpha separately so transparent black cannot bleed in."""
    if abs(deg) < 0.05:
        return img
    rgb = img.convert("RGB").rotate(
        deg, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(255, 255, 255)
    )
    alpha = img.getchannel("A").rotate(
        deg, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=0
    )
    return Image.merge("RGBA", (*rgb.split(), alpha))


def apply_polygon_mask(img, polygons):
    """Clear alpha outside every allowed polygon (fractions of the image size)."""
    w, h = img.size
    allowed = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(allowed)
    for poly in polygons:
        draw.polygon([(x * w, y * h) for x, y in poly], fill=255)
    return Image.composite(img, Image.new("RGBA", (w, h), (0, 0, 0, 0)), allowed)


def _label_components(mask):
    """Two-pass 8-connected labelling of a small boolean mask; returns (labels, roots)."""
    h, w = mask.shape
    labels = np.zeros((h, w), np.int32)
    parent = [0]

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    next_label = 1
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if not row[x]:
                continue
            up = labels[y - 1, x] if y > 0 else 0
            left = labels[y, x - 1] if x > 0 else 0
            if up and left:
                labels[y, x] = min(up, left)
                ra, rb = find(up), find(left)
                if ra != rb:
                    parent[max(ra, rb)] = min(ra, rb)
            elif up or left:
                labels[y, x] = up or left
            else:
                parent.append(next_label)
                labels[y, x] = next_label
                next_label += 1
    roots = np.array([0] + [find(i) for i in range(1, len(parent))], dtype=np.int32)
    return labels, roots


def drop_small_components(alpha, min_frac=0.25, max_blobs=8, scale=4):
    """Keep only alpha blobs at least min_frac of the largest blob's area.

    Removes detached scraps the matte picked up: stray sides, shadow pools and
    other plated items that never touch the hero object.
    """
    work_w = max(1, alpha.width // scale)
    work_h = max(1, alpha.height // scale)
    small = alpha.resize((work_w, work_h), Image.Resampling.BILINEAR)
    mask = np.asarray(small) > 96
    if not mask.any():
        return alpha
    labels, roots = _label_components(mask)
    flat = roots[labels]
    counts = np.bincount(flat.ravel())
    counts[0] = 0
    order = np.argsort(counts)[::-1][:max_blobs]
    biggest = int(counts[order[0]]) if len(order) else 0
    if biggest == 0:
        return alpha
    keep_ids = [int(i) for i in order if counts[i] >= min_frac * biggest]
    keep = np.isin(flat, keep_ids)
    keep_mask = Image.fromarray((keep * 255).astype(np.uint8), "L").resize(
        alpha.size, Image.Resampling.BILINEAR
    )
    out = np.asarray(alpha).copy()
    out[np.asarray(keep_mask) <= 127] = 0
    kept_frac = float((np.asarray(alpha) > 0).sum() and (out > 0).sum()) / max(
        1, int((np.asarray(alpha) > 0).sum())
    )
    print(f"  components: kept {len(keep_ids)} blob(s) = {kept_frac * 100:.1f}% of mask")
    return Image.fromarray(out, "L")


def neutralize_low_saturation(img, strength=1.0, sat_cutoff=0.35):
    """Pull faint colour casts toward grey - e.g. greenery bleeding through a
    clear plastic bottle. Only low-saturation pixels move, so vivid accents
    such as a blue bottle cap keep their colour.
    """
    arr = np.asarray(img, dtype=np.float32)
    mx = arr.max(axis=2)
    mn = arr.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1.0)
    gray = arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    weight = np.clip(1.0 - sat / float(sat_cutoff), 0.0, 1.0) * float(strength)
    out = arr * (1.0 - weight[..., None]) + gray[..., None] * weight[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")


def trim_to_bbox(img, pad):
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        return img
    w, h = img.size
    box = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(w, bbox[2] + pad),
        min(h, bbox[3] + pad),
    )
    return img.crop(box)


def process(item, root):
    src = item["src"] if os.path.isabs(item["src"]) else os.path.join(root, item["src"])
    out = item["out"] if os.path.isabs(item["out"]) else os.path.join(root, item["out"])
    erode = int(item.get("erode", 2))
    blur = float(item.get("blur", 0.8))

    print(f"[{item['id']}] {item['src']}")
    source = Image.open(src)
    source_alpha = None
    if item.get("source_alpha"):
        source = source.convert("RGBA")
        source_alpha = source.getchannel("A")
    img = source.convert("RGB")
    before = img.size
    img = fractional_crop(img, item.get("crop"))
    if source_alpha is not None:
        source_alpha = fractional_crop(source_alpha, item.get("crop"))
    if img.size != before:
        print(f"  crop {before[0]}x{before[1]} -> {img.size[0]}x{img.size[1]}")
    desat = float(item.get("desaturate", 0))
    if desat > 0:
        img = Image.blend(img, img.convert("L").convert("RGB"), min(1.0, desat))
        print(f"  desaturated {desat * 100:.0f}% toward luminance")
    if item.get("low_sat"):
        cutoff = float(item.get("low_sat_cutoff", 0.35))
        img = neutralize_low_saturation(img, float(item["low_sat"]), cutoff)
        print(f"  neutralised low-sat pixels (strength {item['low_sat']}, cutoff {cutoff})")

    if source_alpha is not None:
        alpha = source_alpha
        print("  source alpha reused (rembg skipped)")
    else:
        alpha = infer_alpha(img, item.get("model", "u2net"))
    cut = Image.merge("RGBA", (*img.split(), alpha))
    if item.get("keep_polygon"):
        cut = apply_polygon_mask(cut, item["keep_polygon"])
        print(f"  guided matte: {len(item['keep_polygon'])} polygon(s)")
        alpha = cut.getchannel("A")
    if erode > 0:
        alpha = alpha.filter(ImageFilter.MinFilter(erode * 2 + 1))
    if blur > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(blur))
    if item.get("min_component"):
        alpha = drop_small_components(alpha, float(item["min_component"]))
    cut = trim_to_bbox(Image.merge("RGBA", (*img.split(), alpha)), 0)

    if item.get("level"):
        deg = principal_axis_deg(cut.getchannel("A"))
        print(f"  level {deg:+.2f} deg")
        cut = trim_to_bbox(rotate_rgba(cut, deg), 0)
        if blur > 0:
            a = cut.getchannel("A").filter(ImageFilter.GaussianBlur(blur * 0.5))
            cut = Image.merge("RGBA", (*cut.convert("RGB").split(), a))
            cut = trim_to_bbox(cut, 0)

    trim = item.get("trim")
    if trim:
        w, h = cut.size
        cut = cut.crop(
            (
                int(trim[0] * w),
                int(trim[1] * h),
                int(round((1 - trim[2]) * w)),
                int(round((1 - trim[3]) * h)),
            )
        )
        cut = trim_to_bbox(cut, 0)

    cut = trim_to_bbox(cut, int(item.get("pad", 12)))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    cut.save(out, "PNG")
    print(f"  -> {item['out']} ({cut.width}x{cut.height})")


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(argv[1]) as fh:
        items = json.load(fh)
    only = set(argv[2:])
    if only:
        items = [i for i in items if i["id"] in only]
        print(f"filtered to: {sorted(i['id'] for i in items)}")
    for item in items:
        process(item, root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
