import os
import rembg
from PIL import Image, ImageFilter
import numpy as np
import scipy.ndimage as ndi
from skimage.restoration import denoise_bilateral

ROOT_DIR = "/home/f0id/Downloads/fastfoodfriends"
MENU_IMAGE_PATH = "/home/f0id/Downloads/fastfoodfriendsmenu.jpg"
ASSETS_DIR = os.path.join(ROOT_DIR, "assets-src/menu")
os.makedirs(ASSETS_DIR, exist_ok=True)

img = Image.open(MENU_IMAGE_PATH).convert("RGB")

SPECS = {
    "hamburger": {
        "box": (5, 321, 204, 447),
        "type": "rembg",
    },
    "chickenburger": {
        "box": (238, 336, 395, 445),
        "type": "rembg",
    },
    "cheeseburger": {
        "box": (434, 336, 632, 443),
        "type": "rembg",
    },
    "friends-burger": {
        "box": (38, 510, 206, 620),
        "type": "rembg",
    },
    "hotdog": {
        "box": (234, 524, 404, 619),
        "type": "rembg",
    },
    "tost": {
        "box": (428, 524, 611, 619),
        "type": "rembg",
    },
    "pomfrit-porcion": {
        "box": (6, 684, 184, 785),
        "type": "floodfill",
    },
    "pomfrit-1-2": {
        "box": (270, 700, 368, 786),
        "type": "floodfill",
    },
    "tost-me-proshut": {
        "box": (427, 698, 602, 785),
        "type": "rembg",
    },
    "tost-proshut-rrumbullak": {
        "box": (5, 852, 206, 946),
        "type": "rembg",
        "clean_text": True,
    },
}

session = rembg.new_session("u2net")

for name, spec in SPECS.items():
    print(f"Processing {name} (type: {spec['type']})...")
    crop = img.crop(spec["box"])
    
    # 1. Edge-preserving bilateral smoothing to eliminate JPEG compression noise
    crop_np = np.array(crop, dtype=np.float32) / 255.0
    denoised_np = denoise_bilateral(crop_np, sigma_color=0.04, sigma_spatial=1.2, channel_axis=-1)
    crop_denoised = Image.fromarray((denoised_np * 255).astype(np.uint8), "RGB")
    
    # 2. Precision Segmentation
    if spec["type"] == "floodfill":
        # Border floodfill for fries & white carton
        arr = np.array(crop_denoised, dtype=np.float32)
        is_dark = (arr.max(axis=2) < 24)
        labeled, num_features = ndi.label(is_dark)
        border_mask = np.zeros(is_dark.shape, dtype=bool)
        border_mask[0, :] = True
        border_mask[-1, :] = True
        border_mask[:, 0] = True
        border_mask[:, -1] = True
        
        border_labels = set(labeled[border_mask & is_dark])
        bg_mask = np.isin(labeled, list(border_labels))
        fg_mask = ~bg_mask
        
        # Keep only the largest connected component (eliminates faint background line-art)
        labeled_fg, num_fg = ndi.label(fg_mask)
        sizes = ndi.sum(fg_mask, labeled_fg, range(num_fg + 1))
        largest_label = np.argmax(sizes[1:]) + 1
        main_fg = (labeled_fg == largest_label)
        main_fg_filled = ndi.binary_fill_holes(main_fg)
        raw_alpha = np.where(main_fg_filled, 255.0, 0.0)
    else:
        # Neural rembg segmentation
        cutout = rembg.remove(crop_denoised, session=session)
        rembg_alpha = np.array(cutout.split()[3], dtype=np.float32)
        
        # If item has nearby text (like tost-proshut-rrumbullak), zero out white text in lower-right
        if spec.get("clean_text"):
            arr_t = np.array(crop_denoised)
            is_text = np.zeros(arr_t.shape[:2], dtype=bool)
            is_text[75:, 70:] = (arr_t[75:, 70:, 2] > 160) & (arr_t[75:, 70:, 0] > 180) & (arr_t[75:, 70:, 1] > 180)
            text_dil = ndi.binary_dilation(is_text, iterations=2)
            rembg_alpha[text_dil] = 0.0
            
        fg = rembg_alpha > 40
        labeled, num_features = ndi.label(fg)
        if num_features > 0:
            sizes = ndi.sum(fg, labeled, range(num_features + 1))
            largest_label = np.argmax(sizes[1:]) + 1
            main_fg = (labeled == largest_label)
            main_fg_filled = ndi.binary_fill_holes(main_fg)
            raw_alpha = np.where(main_fg_filled, 255.0, 0.0)
        else:
            raw_alpha = rembg_alpha
        
    # Strictly zero out exterior black flyer background (< 20 RGB)
    arr_rgb = np.array(crop_denoised, dtype=np.float32)
    is_pure_bg = (arr_rgb.max(axis=2) < 20)
    labeled_dark, num_dark = ndi.label(is_pure_bg)
    border_dark = np.zeros(is_pure_bg.shape, dtype=bool)
    border_dark[0, :] = True
    border_dark[-1, :] = True
    border_dark[:, 0] = True
    border_dark[:, -1] = True
    ext_labels = set(labeled_dark[border_dark & is_pure_bg])
    ext_bg = np.isin(labeled_dark, list(ext_labels))
    raw_alpha[ext_bg] = 0.0
    
    # 3. Super-Resolution 3.5x Upscaling with Lanczos for crisp display
    w, h = crop.size
    target_scale = 3.5
    target_w, target_h = int(w * target_scale), int(h * target_scale)
    
    crop_large = crop_denoised.resize((target_w, target_h), Image.Resampling.LANCZOS)
    alpha_large = Image.fromarray(np.clip(raw_alpha, 0, 255).astype(np.uint8), "L").resize(
        (target_w, target_h), Image.Resampling.LANCZOS
    )
    
    # 4. 100% Original Flyer Colors (NO artificial saturation boost, NO contrast alterations!)
    # Subtle sharpness to preserve fine seed and crust textures
    sharp_fine = crop_large.filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=2))
    
    # 5. Smooth Alpha Boundary (0.7px Gaussian blur)
    alpha_smooth = np.array(alpha_large.filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32)
    large_rgb_np = np.array(sharp_fine, dtype=np.float32)
    
    # 6. Euclidean Distance Transform Color Decontamination:
    # Eliminates black edge fringe by extending true food RGB into alpha border falloff
    solid_fg = (alpha_smooth > 220) & (large_rgb_np.max(axis=2) > 30)
    indices = ndi.distance_transform_edt(~solid_fg, return_distances=False, return_indices=True)
    dilated_rgb = large_rgb_np[indices[0], indices[1]]
    
    edge_mask = (alpha_smooth > 0) & (alpha_smooth < 240)
    clean_rgb = large_rgb_np.copy()
    clean_rgb[edge_mask] = dilated_rgb[edge_mask]
    
    result_rgba = np.dstack([clean_rgb, alpha_smooth])
    result_rgba = np.clip(result_rgba, 0, 255).astype(np.uint8)
    out_img = Image.fromarray(result_rgba, "RGBA")
    
    # 7. Auto-trim with generous 8px transparent padding
    bbox = out_img.getbbox()
    if bbox:
        out_img = out_img.crop((
            max(0, bbox[0] - 8),
            max(0, bbox[1] - 8),
            min(out_img.width, bbox[2] + 8),
            min(out_img.height, bbox[3] + 8)
        ))
        
    out_path = os.path.join(ASSETS_DIR, f"{name}.webp")
    out_img.save(out_path, "WEBP", quality=98, method=6)
    print(f"  -> Saved {out_path} ({out_img.width}x{out_img.height})")

print("All 10 food items extracted with 100% flyer color fidelity, solid bodies, and clean edges!")
