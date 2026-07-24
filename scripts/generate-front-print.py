#!/usr/bin/env python3
"""Generate premium print-ready ALLEXO business card front."""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_REF = ROOT / "print" / "allexo-logo-front.png"
FRONT_SOURCE = ROOT / "print" / "allexo-front-source.png"
FRONT_TRIM_OUT = ROOT / "print" / "allexo-front.png"
OUT_DIR = ROOT / "print" / "front"

DPI = 300
MM_PER_IN = 25.4

TRIM_W_MM = 85.0
TRIM_H_MM = 55.0
BLEED_MM = 2.0
LOGO_HEIGHT_RATIO = 0.425  # 42.5 % висоти картки
BG = (5, 5, 5)

CANVAS_W_MM = TRIM_W_MM + BLEED_MM * 2
CANVAS_H_MM = TRIM_H_MM + BLEED_MM * 2

# Пропорції слогана з print/allexo-front-source.png (еталон PDF)
_TAG_MDF_OFFSET = 1
_TAG_MDF_WIDTH = 110
_TAG_INNER_WIDTH = 455


def mm_to_px(mm: float) -> int:
    return round(mm / MM_PER_IN * DPI)


def is_white(r: int, g: int, b: int) -> bool:
    return r > 235 and g > 235 and b > 235


def is_black(r: int, g: int, b: int) -> bool:
    return r < 40 and g < 40 and b < 40


def is_gold(r: int, g: int, b: int) -> bool:
    return r > 120 and g > 80 and b < 130 and r > g and max(r, g, b) > 90


def trim_alpha(img: Image.Image) -> Image.Image:
    bbox = img.split()[-1].getbbox()
    if not bbox:
        raise RuntimeError("Logo has no visible pixels")
    return img.crop(bbox)


def knock_out_black(img: Image.Image) -> Image.Image:
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_black(r, g, b):
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r, g, b, 255)
    return img


def extract_logo_from_reference(path: Path) -> Image.Image:
    """Витягнути логотип із референсу: без білого фону та чорного кола."""
    img = Image.open(path).convert("RGBA")
    px = img.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_white(r, g, b) or is_black(r, g, b):
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r, g, b, 255)

    bbox = img.split()[-1].getbbox()
    if not bbox:
        raise RuntimeError("Logo content not found in reference image")
    return img.crop(bbox)


def _gold_runs(tag: Image.Image, min_width: int = 40) -> list[tuple[int, int]]:
    w, h = tag.size
    runs: list[tuple[int, int]] = []
    in_run = False
    start = 0
    for x in range(w):
        has_gold = any(is_gold(*tag.getpixel((x, y))[:3]) for y in range(h))
        if has_gold and not in_run:
            start = x
            in_run = True
        elif not has_gold and in_run:
            if x - start >= min_width:
                runs.append((start, x - 1))
            in_run = False
    if in_run and w - start >= min_width:
        runs.append((start, w - 1))
    return runs


def _tagline_band(logo: Image.Image) -> tuple[int, int]:
    w, h = logo.size
    best: tuple[int, int] | None = None
    best_score = 0
    for y0 in range(max(0, h - 200), max(0, h - 30)):
        y1 = min(h, y0 + 55)
        band = logo.crop((0, y0, w, y1))
        gold_runs = _gold_runs(band, min_width=30)
        white_cols = sum(
            1
            for x in range(w)
            if any(min(band.getpixel((x, y))[:3]) > 200 for y in range(band.height))
        )
        if len(gold_runs) < 2 or white_cols < 100:
            continue
        score = white_cols + len(gold_runs) * 50
        if score > best_score:
            best_score = score
            best = (y0, y1)
    if best:
        return best
    return h - 56, h


def remove_mdf_tagline(logo: Image.Image) -> Image.Image:
    """Прибрати MDF і вирівняти WINDOW FINISHING між золотими лініями."""
    logo = logo.copy()
    y0, y1 = _tagline_band(logo)
    tag = logo.crop((0, y0, logo.width, y1))
    h = tag.height

    gold_runs = _gold_runs(tag)
    if len(gold_runs) < 2:
        return trim_alpha(logo)

    left_run, right_run = gold_runs[0], gold_runs[-1]
    inner_w = right_run[0] - left_run[1] - 1
    scale = inner_w / _TAG_INNER_WIDTH if _TAG_INNER_WIDTH else 1.0
    mdf_offset = max(1, round(_TAG_MDF_OFFSET * scale))
    mdf_width = max(1, round(_TAG_MDF_WIDTH * scale))

    left = trim_alpha(knock_out_black(tag.crop((left_run[0], 0, left_run[1] + 1, h)).copy()))
    text = trim_alpha(
        knock_out_black(tag.crop((left_run[1] + 1 + mdf_offset + mdf_width, 0, right_run[0], h)).copy())
    )
    right = trim_alpha(knock_out_black(tag.crop((right_run[0], 0, right_run[1] + 1, h)).copy()))

    gap_after_left = mdf_offset
    last_text_x = max(
        x
        for x in range(right_run[0])
        if any(min(tag.getpixel((x, y))[:3]) > 200 for y in range(h))
    )
    gap_before_right = right_run[0] - last_text_x - 1

    orig_bbox = knock_out_black(tag.copy()).split()[-1].getbbox()
    if not orig_bbox:
        return trim_alpha(logo)
    orig_l, _, orig_r, _ = orig_bbox
    orig_w = orig_r - orig_l + 1

    inner = left.width + gap_after_left + text.width + gap_before_right + right.width
    start = orig_l + (orig_w - inner) // 2

    row_h = max(left.height, text.height, right.height)
    row = Image.new("RGBA", (orig_w, row_h), (0, 0, 0, 0))
    x = start - orig_l
    row.paste(left, (x, (row_h - left.height) // 2), left)
    x += left.width + gap_after_left
    row.paste(text, (x, (row_h - text.height) // 2), text)
    x += text.width + gap_before_right
    row.paste(right, (x, (row_h - right.height) // 2), right)

    out = logo.copy()
    px = out.load()
    for y in range(y0, y1):
        for x in range(out.width):
            px[x, y] = (0, 0, 0, 0)
    out.paste(row, ((out.width - row.width) // 2, y0), row)
    return trim_alpha(out)


def load_logo(path: Path) -> Image.Image:
    """Логотип як у PDF: AX + ALLEXO + WINDOW FINISHING (без MDF)."""
    if FRONT_SOURCE.exists():
        logo = Image.open(FRONT_SOURCE).convert("RGBA")
    elif path.exists():
        logo = extract_logo_from_reference(path)
    else:
        raise FileNotFoundError(f"Logo not found: {FRONT_SOURCE} or {path}")
    return remove_mdf_tagline(logo)


def logo_content_box(img: Image.Image) -> tuple[int, int, int, int]:
    alpha = img.split()[-1]
    return alpha.getbbox() or (0, 0, img.width, img.height)


def build_canvas(logo: Image.Image) -> Image.Image:
    canvas = Image.new("RGB", (mm_to_px(CANVAS_W_MM), mm_to_px(CANVAS_H_MM)), BG)
    crop = logo.crop(logo_content_box(logo))

    logo_h_mm = TRIM_H_MM * LOGO_HEIGHT_RATIO
    logo_h_px = mm_to_px(logo_h_mm)
    logo_w_px = round(crop.width * (logo_h_px / crop.height))
    crop = crop.resize((logo_w_px, logo_h_px), Image.Resampling.LANCZOS)

    bleed_px = mm_to_px(BLEED_MM)
    trim_w_px = mm_to_px(TRIM_W_MM)
    trim_h_px = mm_to_px(TRIM_H_MM)

    center_x = bleed_px + trim_w_px // 2
    center_y = bleed_px + trim_h_px // 2
    x = center_x - logo_w_px // 2
    y = center_y - logo_h_px // 2

    canvas.paste(crop, (x, y), crop)
    return canvas


def save_png_rgb(canvas: Image.Image, path: Path) -> None:
    canvas.save(path, format="PNG", dpi=(DPI, DPI), optimize=True)


def save_cmyk_tiff(canvas: Image.Image, path: Path) -> None:
    canvas.convert("CMYK").save(path, format="TIFF", dpi=(DPI, DPI), compression="tiff_lzw")


def save_svg(logo: Image.Image, path: Path) -> None:
    crop = logo.crop(logo_content_box(logo))
    buf = io.BytesIO()
    crop.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    logo_h_mm = TRIM_H_MM * LOGO_HEIGHT_RATIO
    aspect = crop.width / crop.height
    logo_w_mm = logo_h_mm * aspect
    x_mm = (CANVAS_W_MM - logo_w_mm) / 2
    y_mm = (CANVAS_H_MM - logo_h_mm) / 2

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="{CANVAS_W_MM}mm" height="{CANVAS_H_MM}mm"
     viewBox="0 0 {CANVAS_W_MM} {CANVAS_H_MM}">
  <title>ALLEXO — front</title>
  <desc>Premium business card front. Trim {TRIM_W_MM}×{TRIM_H_MM} mm, bleed {BLEED_MM} mm, 300 DPI.</desc>
  <rect width="{CANVAS_W_MM}" height="{CANVAS_H_MM}" fill="#050505"/>
  <image x="{x_mm:.4f}" y="{y_mm:.4f}" width="{logo_w_mm:.4f}" height="{logo_h_mm:.4f}"
         xlink:href="data:image/png;base64,{b64}" preserveAspectRatio="xMidYMid meet"/>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def save_pdf(canvas: Image.Image, path: Path) -> None:
    canvas.save(path, format="PDF", resolution=DPI)


def main() -> None:
    if not FRONT_SOURCE.exists() and not SRC_REF.exists():
        raise SystemExit(f"Reference not found: {FRONT_SOURCE} or {SRC_REF}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    logo = load_logo(SRC_REF)
    logo.save(OUT_DIR / "allexo-logo-extracted.png")

    canvas = build_canvas(logo)

    png_bleed = OUT_DIR / "allexo-front-85x55mm-300dpi.png"
    png_trim = OUT_DIR / "allexo-front-trim-85x55mm-300dpi.png"
    tiff_cmyk = OUT_DIR / "allexo-front-85x55mm-300dpi-cmyk.tif"
    svg_out = OUT_DIR / "allexo-front-85x55mm.svg"
    pdf_out = OUT_DIR / "allexo-front-85x55mm.pdf"

    save_png_rgb(canvas, png_bleed)
    save_svg(logo, svg_out)
    save_pdf(canvas, pdf_out)
    save_cmyk_tiff(canvas, tiff_cmyk)

    bleed_px = mm_to_px(BLEED_MM)
    trim = canvas.crop(
        (
            bleed_px,
            bleed_px,
            bleed_px + mm_to_px(TRIM_W_MM),
            bleed_px + mm_to_px(TRIM_H_MM),
        )
    )
    trim.save(png_trim, format="PNG", dpi=(DPI, DPI), optimize=True)
    trim.save(FRONT_TRIM_OUT, format="PNG", dpi=(DPI, DPI), optimize=True)

    print("Generated:")
    for p in (png_bleed, png_trim, tiff_cmyk, svg_out, pdf_out):
        print(" ", p.relative_to(ROOT))


if __name__ == "__main__":
    main()
