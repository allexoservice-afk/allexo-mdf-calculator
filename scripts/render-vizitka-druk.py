#!/usr/bin/env python3
"""ALLEXO business card — print-ready 85×55 mm + 3 mm bleed (91×61)."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "print" / "druk"
QR_PATH = OUT / "_qr-allexo-be-print.png"

# mm → px @ 300 dpi
DPI = 300
MM = DPI / 25.4
TRIM_W, TRIM_H = 85.0, 55.0
BLEED = 3.0
W = int(round((TRIM_W + BLEED * 2) * MM))  # 91 mm
H = int(round((TRIM_H + BLEED * 2) * MM))  # 61 mm
BLEED_PX = int(round(BLEED * MM))
SAFE = int(round(4 * MM))  # safe inset from trim

# Colors — match reference charcoal + gold
BG = (34, 35, 37)
GOLD = (197, 162, 103)
GOLD_DARK = (150, 118, 70)
GOLD_LIGHT = (228, 205, 155)
TEXT = (220, 214, 204)
CREAM = (242, 232, 213)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def textured_bg(w: int, h: int) -> Image.Image:
    im = Image.new("RGB", (w, h), BG)
    px = im.load()
    random.seed(42)
    for x in range(0, w, 2):
        for y in range(0, h, 2):
            if random.random() < 0.12:
                v = random.randint(-6, 6)
                r, g, b = px[x, y]
                px[x, y] = (
                    max(0, min(255, r + v)),
                    max(0, min(255, g + v)),
                    max(0, min(255, b + v)),
                )
    return im


def draw_gold_wordmark(draw: ImageDraw.ImageDraw, text: str, cx: float, cy: float, f: ImageFont.FreeTypeFont):
    bbox = draw.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = cx - tw / 2
    y = cy - th / 2 - bbox[1]
    # subtle emboss / foil stack
    draw.text((x + 2, y + 2), text, font=f, fill=GOLD_DARK)
    draw.text((x, y), text, font=f, fill=GOLD)
    draw.text((x - 0.5, y - 0.8), text, font=f, fill=GOLD_LIGHT)


def icon_phone(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 14):
    d.rounded_rectangle((x, y, x + s * 0.72, y + s), radius=s * 0.12, outline=GOLD, width=2)
    d.line((x + s * 0.18, y + s * 0.28, x + s * 0.54, y + s * 0.28), fill=GOLD, width=2)


def icon_globe(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 14):
    d.ellipse((x, y, x + s, y + s), outline=GOLD, width=2)
    d.ellipse((x + s * 0.28, y, x + s * 0.72, y + s), outline=GOLD, width=1)
    d.line((x, y + s / 2, x + s, y + s / 2), fill=GOLD, width=1)


def icon_building(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 14):
    d.rectangle((x, y + 1, x + s, y + s), outline=GOLD, width=2)
    d.line((x + s / 3, y + 1, x + s / 3, y + s), fill=GOLD, width=1)
    d.line((x + 2 * s / 3, y + 1, x + 2 * s / 3, y + s), fill=GOLD, width=1)
    d.line((x, y + s * 0.45, x + s, y + s * 0.45), fill=GOLD, width=1)


def icon_pin(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 14):
    d.ellipse((x + 2, y, x + s - 2, y + s * 0.65), outline=GOLD, width=2)
    d.line((x + s / 2, y + s * 0.55, x + s / 2, y + s), fill=GOLD, width=2)


def icon_panels(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 26):
    d.rectangle((x, y, x + s * 0.85, y + s * 0.72), outline=GOLD, width=2)
    d.line((x + s * 0.28, y, x + s * 0.28, y + s * 0.72), fill=GOLD, width=1)
    d.line((x + s * 0.56, y, x + s * 0.56, y + s * 0.72), fill=GOLD, width=1)
    d.line((x, y + s * 0.36, x + s * 0.85, y + s * 0.36), fill=GOLD, width=1)


def icon_doors(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 26):
    d.rectangle((x, y, x + s * 0.38, y + s * 0.85), outline=GOLD, width=2)
    d.rectangle((x + s * 0.48, y, x + s * 0.86, y + s * 0.85), outline=GOLD, width=2)


def icon_garage(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 26):
    d.rectangle((x, y + 3, x + s * 0.9, y + s * 0.85), outline=GOLD, width=2)
    for i in range(1, 4):
        yy = y + 3 + i * (s * 0.2)
        d.line((x, yy, x + s * 0.9, yy), fill=GOLD, width=1)


def icon_gear(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 26):
    cx, cy, r = x + s * 0.4, y + s * 0.4, s * 0.32
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=GOLD, width=2)
    d.ellipse((cx - r * 0.35, cy - r * 0.35, cx + r * 0.35, cy + r * 0.35), outline=GOLD, width=2)
    for a in range(0, 360, 45):
        rad = math.radians(a)
        x1 = cx + math.cos(rad) * r * 0.75
        y1 = cy + math.sin(rad) * r * 0.75
        x2 = cx + math.cos(rad) * r * 1.15
        y2 = cy + math.sin(rad) * r * 1.15
        d.line((x1, y1, x2, y2), fill=GOLD, width=2)


def icon_wrench(d: ImageDraw.ImageDraw, x: float, y: float, s: float = 26):
    d.line((x + 3, y + s * 0.75, x + s * 0.75, y + 4), fill=GOLD, width=3)
    d.ellipse((x + s * 0.55, y, x + s * 0.9, y + s * 0.35), outline=GOLD, width=2)


def render_front() -> Image.Image:
    im = textured_bg(W, H)
    d = ImageDraw.Draw(im)
    # content within trim + safe
    cx = W / 2
    cy = BLEED_PX + TRIM_H * MM * 0.42
    draw_gold_wordmark(d, "ALLEXO", cx, cy, font(int(11.5 * MM), bold=True))

    # footer — 4 columns inside trim safe
    footer_y = BLEED_PX + TRIM_H * MM - SAFE - int(2.2 * MM)
    left = BLEED_PX + SAFE
    right = W - BLEED_PX - SAFE
    span = right - left
    items = [
        (icon_phone, "+32 493 86 07 53"),
        (icon_globe, "allexo.be"),
        (icon_building, "BTW BE1022.379.505"),
        (icon_pin, "Brugge, West-Vlaanderen"),
    ]
    f = font(int(1.55 * MM))
    col_w = span / 4
    for i, (icon_fn, label) in enumerate(items):
        col_cx = left + col_w * i + col_w / 2
        tb = d.textbbox((0, 0), label, font=f)
        tw = tb[2] - tb[0]
        # icon left of text, group centered
        gap = int(0.35 * MM)
        icon_s = int(1.55 * MM)
        group_w = icon_s + gap + tw
        gx = col_cx - group_w / 2
        icon_fn(d, gx, footer_y + 1, icon_s)
        d.text((gx + icon_s + gap, footer_y), label, font=f, fill=GOLD)
        if i < 3:
            sx = left + col_w * (i + 1)
            d.line((sx, footer_y - 2, sx, footer_y + int(2.2 * MM)), fill=GOLD, width=2)
    return im


def render_back() -> Image.Image:
    im = textured_bg(W, H)
    d = ImageDraw.Draw(im)

    services = [
        (icon_panels, "Dagkanten – MDF – PVC"),
        (icon_doors, "Montage ramen & deuren"),
        (icon_garage, "Montage garagepoorten"),
        (icon_gear, "Service & onderhoud"),
        (icon_wrench, "Herstelling rolluiken, ramen & deuren"),
    ]
    f = font(int(2.05 * MM))
    left = BLEED_PX + SAFE
    top = BLEED_PX + SAFE + int(1.5 * MM)
    row_h = (TRIM_H * MM - 2 * SAFE - int(3 * MM)) / 5
    for i, (icon_fn, label) in enumerate(services):
        yy = top + i * row_h
        icon_fn(d, left, yy + 2, int(2.4 * MM))
        d.text((left + int(3.4 * MM), yy + 2), label, font=f, fill=TEXT)

    # vertical divider
    div_x = BLEED_PX + TRIM_W * MM * 0.60
    d.line(
        (div_x, BLEED_PX + SAFE, div_x, H - BLEED_PX - SAFE),
        fill=GOLD,
        width=2,
    )

    # QR block (right)
    qr = Image.open(QR_PATH).convert("RGBA")
    qr_mm = 20.0
    qr_px = int(round(qr_mm * MM))
    right_left = div_x
    right_right = W - BLEED_PX - SAFE
    qx = int((right_left + right_right) / 2 - qr_px / 2)
    qy = BLEED_PX + int(TRIM_H * MM * 0.18)
    pad = int(1.2 * MM)
    d.rounded_rectangle(
        (qx - pad, qy - pad, qx + qr_px + pad, qy + qr_px + pad),
        radius=int(0.6 * MM),
        fill=CREAM,
        outline=GOLD,
        width=3,
    )
    qr_r = qr.resize((qr_px, qr_px), Image.Resampling.NEAREST)
    im.paste(qr_r, (qx, qy), qr_r)

    cta1, cta2 = "SCAN EN", "ONTDEK MEER"
    cf = font(int(1.7 * MM), bold=True)
    cy = qy + qr_px + pad + int(2.2 * MM)
    for line, yy in ((cta1, cy), (cta2, cy + int(2.3 * MM))):
        tb = d.textbbox((0, 0), line, font=cf)
        tw = tb[2] - tb[0]
        d.text(((right_left + right_right) / 2 - tw / 2, yy), line, font=cf, fill=GOLD)
    return im


def save_pdf(pages: list[Image.Image], path: Path) -> None:
    # Pillow PDF uses points; set resolution metadata via dpi
    rgb_pages = [p.convert("RGB") for p in pages]
    rgb_pages[0].save(
        path,
        "PDF",
        resolution=DPI,
        save_all=True,
        append_images=rgb_pages[1:],
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not QR_PATH.exists():
        raise SystemExit(f"Missing QR: {QR_PATH}")

    front = render_front()
    back = render_back()

    front_png = OUT / "allexo-vizitka-front-91x61mm-300dpi.png"
    back_png = OUT / "allexo-vizitka-back-91x61mm-300dpi.png"
    pdf_path = OUT / "allexo-vizitka-druk.pdf"
    preview = OUT / "allexo-vizitka-preview.png"

    front.save(front_png, "PNG", dpi=(DPI, DPI))
    back.save(back_png, "PNG", dpi=(DPI, DPI))
    save_pdf([front, back], pdf_path)

    # stacked preview for quick check
    sheet = Image.new("RGB", (W + 40, H * 2 + 60), (245, 242, 236))
    sheet.paste(front, (20, 20))
    sheet.paste(back, (20, H + 40))
    sheet.save(preview, "PNG")

    readme = OUT / "LEES-MIJ-VIZITKA-DRUK.txt"
    readme.write_text(
        """ALLEXO — візитка для друкарні
================================

ВІДДАЙТЕ ЦЕЙ ФАЙЛ:
  → allexo-vizitka-druk.pdf

Або окремо PNG 300 dpi (якщо попросять):
  → allexo-vizitka-front-91x61mm-300dpi.png
  → allexo-vizitka-back-91x61mm-300dpi.png

СПЕЦИФІКАЦІЯ
  Обріз (trim / snijlijn):  85 × 55 mm
  Bleed (afloop):           3 mm з кожного боку — вже в файлі
  Розмір файлу:             91 × 61 mm
  DPI:                      300
  Сторінки:                 1 = лицьова, 2 = зворот
  QR:                       https://allexo.be/

ДЛЯ ЗАМОВЛЕННЯ (NL)
  Formaat snijlijn: 85 × 55 mm
  Afloop: 3 mm — reeds in bestand
  Dubbelzijdig, mat zwart / soft-touch indien mogelijk
  Voor de oplage: QR even testen met smartphone

ПЕРЕГЛЯД
  allexo-vizitka-preview.png
""",
        encoding="utf-8",
    )

    print(f"W×H px: {W}×{H} ({W/MM:.2f}×{H/MM:.2f} mm)")
    print(f"Wrote {pdf_path}")
    print(f"Wrote {front_png}")
    print(f"Wrote {back_png}")
    print(f"Wrote {preview}")


if __name__ == "__main__":
    main()
