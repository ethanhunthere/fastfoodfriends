import sys
import os
import rembg
from PIL import Image, ImageFilter

def isolate_and_clean(input_path, output_path, erode_radius=3, blur_radius=0.6, pad=8):
    session = rembg.new_session('u2netp')
    inp = Image.open(input_path).convert('RGB')
    
    # Remove background with u2netp
    cutout = rembg.remove(inp, session=session)
    
    # Separate channels
    r, g, b, a = cutout.split()
    
    # Clean up alpha: erode 1px (MinFilter with size 3) to eliminate edge halos / fringe
    if erode_radius > 0:
        a = a.filter(ImageFilter.MinFilter(erode_radius))
    if blur_radius > 0:
        a = a.filter(ImageFilter.GaussianBlur(blur_radius))
        
    cleaned = Image.merge('RGBA', (r, g, b, a))
    
    # Crop to non-transparent bounding box
    bbox = cleaned.getbbox()
    if bbox:
        # Add slight padding if requested
        if pad > 0:
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
    print(f"Successfully processed {input_path} -> {output_path} ({cleaned.width}x{cleaned.height})")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python isolate_food.py <input> <output>")
        sys.exit(1)
    isolate_and_clean(sys.argv[1], sys.argv[2])
