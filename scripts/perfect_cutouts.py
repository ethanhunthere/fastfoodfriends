import os
import rembg
from PIL import Image, ImageFilter
import numpy as np
import scipy.ndimage as ndi

ROOT_DIR = "/home/f0id/Downloads/fastfoodfriends"
MENU_IMAGE_PATH = "/home/f0id/Downloads/fastfoodfriendsmenu.jpg"
ASSETS_DIR = os.path.join(ROOT_DIR, "assets-src/menu")
os.makedirs(ASSETS_DIR, exist_ok=True)

img = Image.open(MENU_IMAGE_PATH).convert("RGB")

# Exact coordinates for the 10 foods on fastfoodfriendsmenu.jpg
# Selected to capture 100% of the food (buns, sesame, lettuce, fries, cartons, crusts)
# while excluding adjacent text lines.
SPECS = {
    "hamburger": {
        "box": (18, 321, 222, 447),
        "type": "rembg",
        "pad": 8,
    },
    "chickenburger": {
        "box": (235, 325, 400, 445),
        "type": "rembg",
        "pad": 8,
    },
    "cheeseburger": {
        "box": (430, 323, 624, 444),
        "type": "rembg",
        "pad": 8,
    },
    "friends-burger": {
        "box": (36, 510, 210, 622),
        "type": "rembg",
        "pad": 8,
    },
    "hotdog": {
        "box": (230, 510, 408, 622),
        "type": "rembg",
        "pad": 8,
    },
    "tost": {
        "box": (425, 510, 614, 622),
        "type": "rembg",
        "pad": 8,
    },
    "pomfrit-porcion": {
        "box": (18, 680, 192, 786),
        "type": "floodfill",
        "pad": 8,
    },
    "pomfrit-1-2": {
        "box": (264, 688, 380, 788),
        "type": "floodfill",
        "pad": 8,
    },
    "tost-me-proshut": {
        "box": (424, 684, 606, 786),
        "type": "rembg",
        "pad": 8,
    },
    "tost-proshut-rrumbullak": {
        "box": (18, 852, 208, 950),
        "type": "rembg",
        "pad": 8,
    },
}

session = rembg.new_session("u2net")

def decontaminate_and_clean(crop, raw_alpha):
    arr_rgb = np.array(crop, dtype=np.float32)
    alpha = np.array(raw_alpha, dtype=np.float32)
    
    # 1. Any pixel where the original crop is dark background (RGB < 18) must have alpha 0
    is_pure_bg = (arr_rgb.max(axis=2) < 18)
    alpha[is_pure_bg] = 0.0
    
    # 2. Suppress faint background noise
    alpha[alpha < 18] = 0.0
    
    # 3. Morphological cleanup: smooth the alpha boundary slightly (0.6px blur)
    # to avoid jagged pixel stepping
    alpha_img = Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8), "L")
    alpha_smooth = np.array(alpha_img.filter(ImageFilter.GaussianBlur(0.55)), dtype=np.float32)
    alpha_smooth[is_pure_bg] = 0.0
    
    # 4. Color Decontamination (Defringing against black):
    # Find solid, trustworthy foreground pixels (alpha > 200 and bright enough)
    solid_fg = (alpha_smooth > 200) & (arr_rgb.max(axis=2) > 30)
    
    if np.any(solid_fg):
        # Calculate nearest solid foreground pixel for every point
        indices = ndi.distance_transform_edt(~solid_fg, return_distances=False, return_indices=True)
        dilated_rgb = arr_rgb[indices[0], indices[1]]
        
        # For semi-transparent edge pixels (0 < alpha < 245),
        # replace darkened edge RGB with the true vibrant color of the nearest food pixel!
        edge_mask = (alpha_smooth > 0) & (alpha_smooth < 245)
        clean_rgb = arr_rgb.copy()
        clean_rgb[edge_mask] = dilated_rgb[edge_mask]
    else:
        clean_rgb = arr_rgb.copy()
        
    result_rgba = np.dstack([clean_rgb, alpha_smooth])
    result_rgba = np.clip(result_rgba, 0, 255).astype(np.uint8)
    out_img = Image.fromarray(result_rgba, "RGBA")
    
    # Crop to tight non-transparent bounding box with 6px padding
    bbox = out_img.getbbox()
    if bbox:
        w, h = out_img.size
        pad_box = (
            max(0, bbox[0] - 6),
            max(0, bbox[1] - 6),
            min(w, bbox[2] + 6),
            min(h, bbox[3] + 6)
        )
        out_img = out_img.crop(pad_box)
        
    return out_img

for name, spec in SPECS.items():
    print(f"Processing {name} (type: {spec['type']})...")
    crop = img.crop(spec["box"])
    
    if spec["type"] == "floodfill":
        # Border flood-fill on black for fries + white cartons
        arr = np.array(crop, dtype=np.float32)
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
        # Neural rembg segmentation
        cutout = rembg.remove(crop, session=session)
        raw_alpha = np.array(cutout.split()[3], dtype=np.float32)
        
    cleaned = decontaminate_and_clean(crop, raw_alpha)
    
    # Upscale 2x with Lanczos for ultra-crisp resolution, then gentle unsharp mask
    w2, h2 = cleaned.size[0] * 2, cleaned.size[1] * 2
    upscaled = cleaned.resize((w2, h2), Image.Resampling.LANCZOS)
    
    # Gentle unsharp mask on RGB only to enhance crisp details
    r, g, b, a = upscaled.split()
    rgb_sharp = Image.merge("RGB", (r, g, b)).filter(
        ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2)
    )
    final = Image.merge("RGBA", (*rgb_sharp.split(), a))
    
    out_path = os.path.join(ASSETS_DIR, f"{name}.webp")
    final.save(out_path, "WEBP", quality=98, method=6)
    print(f"  -> Saved {out_path} ({final.size[0]}x{final.size[1]})")

print("All 10 food items extracted with decontaminated edges and high-res clarity!")
