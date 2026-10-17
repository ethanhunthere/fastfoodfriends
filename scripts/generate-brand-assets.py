#!/usr/bin/env python3
"""
Generate all brand metadata imagery:
  1. Favicon (multi-size .ico: 16, 32, 48)
  2. High-res icons (512x512, 192x192)
  3. Apple Touch Icon (180x180 opaque)
  4. Vector/embedded SVG icon
  5. 1200x630 OpenGraph and Twitter social share images
"""
import base64
import io
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC_4K = ROOT / "assets" / "logo" / "fastfoodfriendslogo-4k.jpg"
SRC_CUTOUT = ROOT / "assets" / "logo" / "fastfoodfriendslogo-cutout.png"
APP_DIR = ROOT / "app"
PUB_DIR = ROOT / "public"

def extract_circle_badge(src_path: Path) -> Image.Image:
    src = Image.open(src_path).convert("RGBA")
    w, h = src.size
    cx, cy = 2038, 2044
    radius = 2005

    yy, xx = np.ogrid[:h, :w]
    dist = np.sqrt((xx - cx)**2 + (yy - cy)**2)
    alpha = np.clip(radius + 1.5 - dist, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    arr = np.array(src)
    arr[..., 3] = (alpha * 255).astype(np.uint8)
    cropped = Image.fromarray(arr).crop((int(cx - radius), int(cy - radius), int(cx + radius), int(cy + radius)))
    return cropped

def extract_burger_square(cutout_path: Path) -> Image.Image:
    cutout = Image.open(cutout_path).convert("RGBA")
    bbox = cutout.getbbox()
    cropped = cutout.crop(bbox)
    bw, bh = cropped.size
    max_dim = max(bw, bh)
    square = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
    square.paste(cropped, ((max_dim - bw) // 2, (max_dim - bh) // 2))
    return square

def generate_og_image(circle_badge: Image.Image) -> Image.Image:
    w, h = 1200, 630
    base_color = np.array([13, 9, 6], dtype=np.float32)
    glow_color = np.array([220, 125, 25], dtype=np.float32)

    yy, xx = np.mgrid[:h, :w]
    d = np.sqrt(((xx - 600) / 1.35)**2 + (yy - 315)**2)
    g = np.clip(1.0 - d / 480, 0, 1) ** 2.0

    arr = np.zeros((h, w, 3), dtype=np.float32)
    for c in range(3):
        arr[..., c] = base_color[c] * (1 - g * 0.40) + glow_color[c] * (g * 0.40)

    bg = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    draw = ImageDraw.Draw(bg)

    font_brand = ImageFont.truetype("/home/f0id/.local/share/fonts/Montserrat-Bold.ttf", 38)
    font_subtitle = ImageFont.truetype("/home/f0id/.local/share/fonts/Montserrat-Bold.ttf", 19)
    font_pill = ImageFont.truetype("/home/f0id/.local/share/fonts/Montserrat-Bold.ttf", 15)
    font_url = ImageFont.truetype("/home/f0id/.local/share/fonts/Montserrat-Bold.ttf", 19)

    # 1. Top Brand Header
    brand_text = "FAST FOOD FRIENDS"
    tb_b = draw.textbbox((0, 0), brand_text, font=font_brand)
    bx = (w - (tb_b[2] - tb_b[0])) // 2
    draw.text((bx, 32), brand_text, fill=(253, 246, 226), font=font_brand)

    # 2. Top Sub-pill
    sub_text = "POROSI ONLINE NË PEJË  •  DËRGESA 10–20 MIN"
    tb_s = draw.textbbox((0, 0), sub_text, font=font_pill)
    sw = tb_s[2] - tb_s[0] + 36
    sx = (w - sw) // 2
    draw.rounded_rectangle([sx, 84, sx + sw, 114], radius=15, fill=(38, 26, 16), outline=(218, 140, 30), width=1)
    draw.text((sx + 18, 91), sub_text, fill=(245, 175, 45), font=font_pill)

    # 3. Centered Badge
    b_size = 340
    badge_c = circle_badge.resize((b_size, b_size), Image.LANCZOS)
    bx = (w - b_size) // 2
    by = 135

    shadow = Image.new("RGBA", (b_size + 80, b_size + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([40, 40, b_size + 40, b_size + 40], fill=(0, 0, 0, 200))
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    bg.paste(shadow, (bx - 40, by - 26), shadow)
    bg.paste(badge_c, (bx, by), badge_c)

    # 4. Bottom Text
    b_text_y = by + b_size + 18

    items_text = "Hamburger  •  Chickenburger  •  Hotdog  •  Tosta  •  Pomfrit"
    tb_i = draw.textbbox((0, 0), items_text, font=font_subtitle)
    ix = (w - (tb_i[2] - tb_i[0])) // 2
    draw.text((ix, b_text_y), items_text, fill=(245, 185, 55), font=font_subtitle)

    # 5. Address line
    info_text = "Rruga Vëllezërit Gërvalla (përballë Shkollës Teknike)  •  Pejë  •  Tel: 049 133 800"
    tb_inf = draw.textbbox((0, 0), info_text, font=font_pill)
    inf_x = (w - (tb_inf[2] - tb_inf[0])) // 2
    draw.text((inf_x, b_text_y + 32), info_text, fill=(215, 210, 200), font=font_pill)

    # 6. URL CTA Pill
    url_text = "www.fastfoodfriends.online"
    tb_u = draw.textbbox((0, 0), url_text, font=font_url)
    uw = tb_u[2] - tb_u[0] + 54
    ux = (w - uw) // 2
    uy = b_text_y + 62
    draw.rounded_rectangle([ux, uy, ux + uw, uy + 42], radius=21, fill=(215, 55, 25), outline=(245, 110, 45), width=1)
    draw.text((ux + 27, uy + 10), url_text, fill=(255, 255, 255), font=font_url)

    return bg

def main():
    print("1. Extracting master assets...")
    circle_badge = extract_circle_badge(SRC_4K)
    burger_square = extract_burger_square(SRC_CUTOUT)

    print("2. Generating OpenGraph & Twitter image (1200x630)...")
    og_img = generate_og_image(circle_badge)
    
    # Save OG images
    og_paths = [
        APP_DIR / "opengraph-image.png",
        APP_DIR / "twitter-image.png",
        PUB_DIR / "opengraph-image.png",
        PUB_DIR / "twitter-image.png",
        PUB_DIR / "og-image.png",
    ]
    for p in og_paths:
        og_img.save(p, "PNG", optimize=True)
        print(f"   -> {p.relative_to(ROOT)} ({p.stat().st_size // 1024} KB)")

    print("3. Generating Apple Touch Icon (180x180)...")
    tile_size = 180
    apple_tile = Image.new("RGB", (tile_size, tile_size), (14, 10, 7))
    c_resized = circle_badge.resize((164, 164), Image.LANCZOS)
    apple_tile.paste(c_resized, (8, 8), c_resized)
    
    apple_paths = [
        APP_DIR / "apple-icon.png",
        PUB_DIR / "apple-touch-icon.png",
        PUB_DIR / "apple-touch-icon-precomposed.png",
    ]
    for p in apple_paths:
        apple_tile.save(p, "PNG", optimize=True)
        print(f"   -> {p.relative_to(ROOT)} ({p.stat().st_size // 1024} KB)")

    print("4. Generating High-Res Icons (512x512, 192x192)...")
    icon_512 = circle_badge.resize((512, 512), Image.LANCZOS)
    icon_192 = circle_badge.resize((192, 192), Image.LANCZOS)

    icon_512.save(APP_DIR / "icon.png", "PNG", optimize=True)
    icon_512.save(PUB_DIR / "icon.png", "PNG", optimize=True)
    icon_512.save(PUB_DIR / "icon-512.png", "PNG", optimize=True)
    icon_192.save(PUB_DIR / "icon-192.png", "PNG", optimize=True)
    print("   -> app/icon.png & public/icon-512.png & public/icon-192.png")

    print("5. Generating Multi-resolution Favicon.ico (16, 32, 48)...")
    # For desktop browser tabs, the burger emblem cutout gives maximum legibility
    ico_img = burger_square.resize((48, 48), Image.LANCZOS)
    ico_img.save(APP_DIR / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    ico_img.save(PUB_DIR / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("   -> app/favicon.ico & public/favicon.ico")

    print("6. Generating SVG icon (app/icon.svg & public/icon.svg)...")
    # Encode the 512px PNG into SVG data URI
    buf = io.BytesIO()
    icon_512.save(buf, format="PNG", optimize=True)
    b64_png = base64.b64encode(buf.getvalue()).decode("ascii")
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <title>Fast Food Friends</title>
  <image width="512" height="512" href="data:image/png;base64,{b64_png}" />
</svg>
'''
    (APP_DIR / "icon.svg").write_text(svg_content)
    (PUB_DIR / "icon.svg").write_text(svg_content)
    print("   -> app/icon.svg & public/icon.svg")

    print("\nAll assets generated successfully!")

if __name__ == "__main__":
    main()
