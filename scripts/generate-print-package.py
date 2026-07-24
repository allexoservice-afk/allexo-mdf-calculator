#!/usr/bin/env python3
"""Згенерувати пакет для типографії без Playwright (PIL + Firefox)."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "print" / "druk"
FRONT_SRC = ROOT / "print" / "allexo-front.png"
RENDER_BACK = OUT / "render-back.html"

DPI = 300
MM_PER_IN = 25.4
BLEED_MM = 2
TRIM_W_MM = 85.0
TRIM_H_MM = 55.0
CANVAS_W_MM = TRIM_W_MM + BLEED_MM * 2
CANVAS_H_MM = TRIM_H_MM + BLEED_MM * 2
CANVAS_W_PX = round(CANVAS_W_MM / MM_PER_IN * DPI)
CANVAS_H_PX = round(CANVAS_H_MM / MM_PER_IN * DPI)
TRIM_W_PX = round(TRIM_W_MM / MM_PER_IN * DPI)
TRIM_H_PX = round(TRIM_H_MM / MM_PER_IN * DPI)
BLEED_PX = round(BLEED_MM / MM_PER_IN * DPI)


def mm_to_px(mm: float) -> int:
    return round(mm / MM_PER_IN * DPI)


def build_front_png() -> Path:
    canvas = Image.new("RGB", (CANVAS_W_PX, CANVAS_H_PX), (0, 0, 0))
    front = Image.open(FRONT_SRC).convert("RGB")
    front = front.resize((TRIM_W_PX, TRIM_H_PX), Image.Resampling.LANCZOS)
    canvas.paste(front, (BLEED_PX, BLEED_PX))
    out = OUT / "allexo-front-89x59mm-300dpi.png"
    canvas.save(out, format="PNG", dpi=(DPI, DPI), optimize=True)
    return out


def render_back_with_firefox() -> Path:
    if not RENDER_BACK.exists():
        raise FileNotFoundError(RENDER_BACK)

    firefox = shutil.which("firefox")
    if not firefox:
        raise RuntimeError("Firefox не знайдено для рендеру зворотної сторони")

    out = OUT / "allexo-back-89x59mm-300dpi.png"
    shot = OUT / "_render-back-temp.png"
    url = RENDER_BACK.resolve().as_uri()
    cmd = [
        firefox,
        "--headless",
        f"--screenshot={shot}",
        f"--window-size={CANVAS_W_PX},{CANVAS_H_PX}",
        url,
    ]
    subprocess.run(cmd, check=True, capture_output=True, timeout=60)
    if not shot.exists():
        raise RuntimeError("Firefox не створив скріншот зворотної сторони")
    img = Image.open(shot).convert("RGB")
    img = img.resize((CANVAS_W_PX, CANVAS_H_PX), Image.Resampling.LANCZOS)
    img.save(out, format="PNG", dpi=(DPI, DPI), optimize=True)
    shot.unlink(missing_ok=True)
    return out


def save_pdf(pages: list[Path], out: Path) -> None:
    images = [Image.open(p).convert("RGB") for p in pages]
    images[0].save(
        out,
        format="PDF",
        resolution=DPI,
        save_all=True,
        append_images=images[1:],
    )
    for img in images:
        img.close()


def write_readme() -> None:
    (OUT / "LEES-MIJ-DRUK.txt").write_text(
        """ALLEXO — візитки для типографії
================================

Надішліть у друкарню файл:
  → allexo-vizitka-85x55mm.pdf

Або окремо два PNG (якщо попросять):
  → allexo-front-89x59mm-300dpi.png
  → allexo-back-89x59mm-300dpi.png

Специфікація
  Обріз (trim):     85 × 55 mm
  Bleed:            2 mm (вже в макеті)
  Розмір файлу:     89 × 59 mm
  DPI:              300
  Друк:             двосторонній, матовий чорний

Параметри для замовлення (NL)
  Formaat snijlijn: 85 × 55 mm
  Afloop (bleed):   2 mm — reeds in bestand
  Dubbelzijdig, mat zwart
""",
        encoding="utf-8",
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if not FRONT_SRC.exists():
        sys.exit(f"Немає: {FRONT_SRC}")

    front = build_front_png()
    back = render_back_with_firefox()
    pdf = OUT / "allexo-vizitka-85x55mm.pdf"
    save_pdf([front, back], pdf)
    write_readme()

    print("Готово:")
    for name in (
        "allexo-vizitka-85x55mm.pdf",
        "allexo-front-89x59mm-300dpi.png",
        "allexo-back-89x59mm-300dpi.png",
        "LEES-MIJ-DRUK.txt",
    ):
        print(" ", OUT / name)


if __name__ == "__main__":
    main()
