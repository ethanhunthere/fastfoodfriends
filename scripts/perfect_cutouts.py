import os
import rembg
from PIL import Image, ImageEnhance, ImageFilter
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
        "box": (14, 321, 222, 447),
        "type": "rembg",
    },
    "chickenburger": {
        "box": (235, 324, 400, 446),
        "type": "rembg",
    },
    "cheeseburger": {
        "box": (428, 322, 626, 444),
        "type": "rembg",
    },
    "friends-burger": {
        "box": (35, 510, 212, 622),
        "type": "rembg",
    },
    "hotdog": {
        "box": (230, 510, 410, 622),
        "type": "rembg",
    },
    "tost": {
        "box": (424, 510, 614, 622),
        "type": "rembg",
    },
    "pomfrit-porcion": {
        "box": (15, 682, 192, 788),
        "type": "floodfill",
    },
    "pomfrit-1-2": {
        "box": (265, 700, 378, 790),
        "type": "floodfill",
    },
    "tost-me-proshut": {
        "box": (424, 684, 608, 786),
        "type": "rembg",
    },
    "tost-proshut-rrumbullak": {
        "box": (14, 852, 210, 952),
        "type": "rembg",
    },
}

session = rembg.new_session("u2net")

for name, spec in SPECS.items():
    print(f"Processing {name} (type: {spec['type']})...")
    crop = img.crop(spec["box"])
    
    # 1. Bilateral edge-preserving denoising to eliminate flyer JPEG compression artifacts
    crop_np = np.array(crop, dtype=np.float32) / 255.0
    denoised_np = denoise_bilateral(crop_np, sigma_color=0.06, sigma_spatial=1.5, channel_axis=-1)
    crop_denoised = Image.fromarray((denoised_np * 255).astype(np.uint8), "RGB")
    
    # 2. Precision Segmentation
    if spec["type"] == "floodfill":
        # Border floodfill for fries & white carton
        arr = np.array(crop_denoised, dtype=np.float32)
        is_dark = (arr.max(axis=2) < 22)
        labeled, num_features = ndi.label(is_dark)
        border_mask = np.zeros(is_dark.shape, dtype=bool)
        border_mask[0, :] = True
        border_mask[-1, :] = True
        border_mask[:, 0] = True
        border_mask[:, -1] = True
        
        border_labels = set(labeled[border_mask & is_dark])
        bg_mask = np.isin(labeled, list(border_labels))
        raw_alpha = np.where(bg_mask, 0.0, 255.0)
    else:
        # Neural rembg segmentation for burgers & toasts
        cutout = rembg.remove(crop_denoised, session=session)
        raw_alpha = np.array(cutout.split()[3], dtype=np.float32)
        
    # Strictly zero out black flyer background pixels (< 18 RGB)
    arr_rgb = np.array(crop_denoised, dtype=np.float32)
    is_pure_bg = (arr_rgb.max(axis=2) < 18)
    raw_alpha[is_pure_bg] = 0.0
    raw_alpha[raw_alpha < 18] = 0.0
    
    # 3. Super-Resolution 3.5x Upscaling with Lanczos
    w, h = crop.size
    target_scale = 3.5
    target_w, target_h = int(w * target_scale), int(h * target_scale)
    
    crop_large = crop_denoised.resize((target_w, target_h), Image.Resampling.LANCZOS)
    alpha_large = Image.fromarray(np.clip(raw_alpha, 0, 255).astype(np.uint8), "L").resize(
        (target_w, target_h), Image.Resampling.LANCZOS
    )
    
    # 4. Multi-scale Detail & Appetite Enhancement on RGB:
    # Warm saturation boost (+14%) to make golden buns, cheddar, and fries look delicious
    enh_color = ImageEnhance.Color(crop_large).enhance(1.14)
    # Subtle contrast curve (+6%)
    enh_contrast = ImageEnhance.Contrast(enh_color).enhance(1.06)
    # Fine-frequency texture recovery (sesame seeds, grill lines, bread pores, crispy fries)
    sharp_fine = enh_contrast.filter(ImageFilter.UnsharpMask(radius=1.2, percent=140, threshold=1))
    # Mid-frequency depth / 3D roundness
    sharp_master = sharp_fine.filter(ImageFilter.UnsharpMask(radius=3.0, percent=35, threshold=2))
    
    # 5. Smooth Alpha Boundary (0.7px Gaussian blur)
    alpha_smooth = np.array(alpha_large.filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32)
    large_rgb_np = np.array(sharp_master, dtype=np.float32)
    large_bg_mask = (large_rgb_np.max(axis=2) < 20)
    alpha_smooth[large_bg_mask] = 0.0
    
    # 6. Euclidean Distance Transform Color Decontamination:
    # Propagates true vibrant foreground colors into the semi-transparent edge falloff
    solid_fg = (alpha_smooth > 210) & (large_rgb_np.max(axis=2) > 35)
    indices = ndi.distance_transform_edt(~solid_fg, return_distances=False, return_indices=True)
    dilated_rgb = large_rgb_np[indices[0], indices[1]]
    
    edge_mask = (alpha_smooth > 0) & (alpha_smooth < 245)
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

print("All 10 food items extracted with master quality, decontaminated edges, and super-resolution clarity!")
