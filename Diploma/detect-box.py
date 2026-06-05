"""
Detects the callsign box in the diploma PDF template and writes
its center coordinates (in PDF points) to diploma-box.json.

Re-run whenever the PDF template changes:
  cd Diploma
  python detect-box.py

Requires: pip install pymupdf
"""

import json
import sys
import fitz

PDF_PATH = "Dani reke Save - DIPLOMA.pdf"
OUT_PATH = "diploma-box.json"
SCALE = 3.0
SEARCH_TOP_FRACTION = 0.45


def detect_box(pdf_path: str, scale: float, search_top: float) -> dict:
    doc = fitz.open(pdf_path)
    page = doc[0]
    pdf_w: float = page.rect.width
    pdf_h: float = page.rect.height

    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), colorspace=fitz.csRGB)
    # Build a 2-D grayscale array from raw RGB bytes without numpy
    raw = pix.samples
    img_w, img_h = pix.width, pix.height
    stride = img_w * 3

    def row_mean_center(row_idx: int, cx0: int, cx1: int) -> float:
        base = row_idx * stride
        total = 0.0
        for c in range(cx0, cx1):
            off = base + c * 3
            total += (raw[off] + raw[off + 1] + raw[off + 2]) / 3.0
        return total / (cx1 - cx0)

    cx0 = int(img_w * 0.2)
    cx1 = int(img_w * 0.8)
    top_row = int(img_h * search_top)

    means = [row_mean_center(r, cx0, cx1) for r in range(top_row)]

    # Find the row with the sharpest downward brightness drop
    # (bottom border of the box — goes from ~200 to ~130)
    best_drop = 0.0
    border_bottom_px = 0
    for r in range(1, top_row - 1):
        drop = means[r - 1] - means[r]
        if drop > best_drop:
            best_drop = drop
            border_bottom_px = r

    # Scan upward to find the top of the bright interior region
    box_brightness = means[border_bottom_px - 5]  # row just above border
    threshold = box_brightness * 0.92
    border_top_px = 0
    for r in range(border_bottom_px - 1, 0, -1):
        if means[r] < threshold:
            border_top_px = r
            break

    # Find horizontal extents by scanning a middle row from center outward
    mid_row = (border_top_px + border_bottom_px) // 2
    base = mid_row * stride
    center_brightness = row_mean_center(mid_row, int(img_w * 0.3), int(img_w * 0.7))
    h_threshold = center_brightness * 0.87

    left_px = 0
    for c in range(img_w // 2, 0, -1):
        off = base + c * 3
        b = (raw[off] + raw[off + 1] + raw[off + 2]) / 3.0
        if b < h_threshold:
            left_px = c
            break

    right_px = img_w
    for c in range(img_w // 2, img_w):
        off = base + c * 3
        b = (raw[off] + raw[off + 1] + raw[off + 2]) / 3.0
        if b < h_threshold:
            right_px = c
            break

    pt = lambda px: round(px / scale, 2)
    x1 = pt(left_px)
    x2 = pt(right_px)
    y2 = round(pdf_h - pt(border_top_px), 2)   # top edge → high PDF y
    y1 = round(pdf_h - pt(border_bottom_px), 2) # bottom edge → low PDF y

    return {
        "pageWidth": round(pdf_w, 4),
        "pageHeight": round(pdf_h, 4),
        "box": {
            "x1": x1, "y1": y1,
            "x2": x2, "y2": y2,
            "centerX": round((x1 + x2) / 2, 2),
            "centerY": round((y1 + y2) / 2, 2),
            "width":   round(x2 - x1, 2),
            "height":  round(y2 - y1, 2),
        },
    }


result = detect_box(PDF_PATH, SCALE, SEARCH_TOP_FRACTION)
print(json.dumps(result, indent=2))
with open(OUT_PATH, "w") as f:
    json.dump(result, f, indent=2)
print(f"\nSaved to {OUT_PATH}", file=sys.stderr)
