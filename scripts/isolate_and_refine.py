import os
import sys
import rembg
from PIL import ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
import numpy as np
from PIL import Image, ImageFilter

def isolate_product(input_path, output_path, crop_box=None, erode=2, blur=0.8, pad=12):
    print(f"Processing {os.path.basename(input_path)}...")
    img = Image.open(input_path).convert("RGB")
    
    # If a specific region contains the hero item, crop before rembg to guide the neural model
    if crop_box:
        # crop_box as fractions [left, top, right, bottom]
        w, h = img.size
        box = (
            int(crop_box[0] * w),
            int(crop_box[1] * h),
            int(crop_box[2] * w),
            int(crop_box[3] * h)
        )
        img = img.crop(box)
    
    # Scale down for neural inference if giant, to preserve speed and avoid memory blowup
    orig_w, orig_h = img.size
    max_dim = 2048
    if max(orig_w, orig_h) > max_dim:
        scale = max_dim / max(orig_w, orig_h)
        scaled_img = img.resize((int(orig_w * scale), int(orig_h * scale)), Image.Resampling.LANCZOS)
    else:
        scaled_img = img
    
    session = rembg.new_session('u2net')
    cutout = rembg.remove(scaled_img, session=session)
    
    # If we scaled down, resize alpha mask back to img size
    if scaled_img.size != img.size:
        alpha_mask = cutout.split()[3].resize(img.size, Image.Resampling.LANCZOS)
        cutout = Image.merge("RGBA", (*img.split(), alpha_mask))
    
    r, g, b, a = cutout.split()
    
    # Erode slight boundary edge pixels to eliminate background fringe / halos
    if erode > 0:
        a = a.filter(ImageFilter.MinFilter(erode * 2 + 1))
    if blur > 0:
        a = a.filter(ImageFilter.GaussianBlur(blur))
        
    cleaned = Image.merge("RGBA", (r, g, b, a))
    
    # Crop to non-empty bounding box
    bbox = cleaned.getbbox()
    if bbox:
        w, h = cleaned.size
        bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(w, bbox[2] + pad),
            min(h, bbox[3] + pad)
        )
        cleaned = cleaned.crop(bbox)
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cleaned.save(output_path, "PNG")
    print(f"  -> Generated {output_path} ({cleaned.width}x{cleaned.height})")

