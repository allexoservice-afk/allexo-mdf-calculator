#!/usr/bin/env python3
"""Fetch product descriptions from partner shop pages."""
from __future__ import annotations

import html
import json
import re
import urllib.request
from pathlib import Path

PRODUCTS = [
    ("door-aurora", "https://shop.tverdihoutenproducten.be/en/shop/doors-3/aurora-152"),
    ("door-randevu", "https://shop.tverdihoutenproducten.be/en/shop/doors-3/randevu-153"),
    ("door-elegance", "https://shop.tverdihoutenproducten.be/en/shop/doors-3/elegance-155"),
    ("door-country", "https://shop.tverdihoutenproducten.be/en/shop/doors-3/country-157"),
    ("door-wortel", "https://shop.tverdihoutenproducten.be/en/shop/doors-3/wortel-232"),
    ("door-kernen", "https://shop.tverdihoutenproducten.be/en/shop/doors-3/kernen-233"),
    (
        "door-composite-leaf",
        "https://shop.tverdihoutenproducten.be/en/shop/doors-3/composite-single-door-leaf-2975",
    ),
    (
        "door-flush-leaf",
        "https://shop.tverdihoutenproducten.be/en/shop/doors-3/flush-door-leaf-2980",
    ),
    ("door-frame", "https://shop.tverdihoutenproducten.be/en/shop/doors-3/door-frame-2978"),
    (
        "door-frame-ext",
        "https://shop.tverdihoutenproducten.be/en/shop/doors-3/door-frame-extension-2976",
    ),
    (
        "door-moulding",
        "https://shop.tverdihoutenproducten.be/en/shop/doors-3/oak-door-moulding-2977",
    ),
    ("sill-terra", "https://shop.tverdihoutenproducten.be/en/shop/windowsills-12/terra-59"),
    ("sill-flow", "https://shop.tverdihoutenproducten.be/en/shop/windowsills-12/flow-143"),
    ("sill-facet", "https://shop.tverdihoutenproducten.be/en/shop/windowsills-12/facet-144"),
    ("sill-nord", "https://shop.tverdihoutenproducten.be/en/shop/windowsills-12/nord-145"),
]

SKIP = (
    "cookie",
    "login",
    "add to cart",
    "wishlist",
    "javascript",
    "copyright",
    "privacy",
    "shipping",
    "payment method",
    "sign in",
    "create account",
    "my cart",
    "search",
)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ALLEXOBot/1.0)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def strip_tags(s: str) -> str:
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</(?:p|li|h[1-6]|div|tr)>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n\s*\n+", "\n", s)
    return s.strip()


def extract_og(raw: str) -> str | None:
    m = re.search(
        r'property=["\']og:description["\'][^>]*content=["\']([^"\']+)["\']',
        raw,
        re.I,
    )
    if not m:
        m = re.search(
            r'content=["\']([^"\']+)["\'][^>]*property=["\']og:description["\']',
            raw,
            re.I,
        )
    return html.unescape(m.group(1)).strip() if m else None


def extract_description_block(raw: str) -> str | None:
    patterns = [
        r'id=["\']product_full_description["\'][^>]*>(.*?)</div>\s*(?:<div|</section|</main)',
        r'itemprop=["\']description["\'][^>]*>(.*?)</(?:div|section)',
        r'class=["\'][^"\']*oe_structure[^"\']*["\'][^>]*>(.*?)</div>\s*<div',
        r'data-oe-field=["\']description["\'][^>]*>(.*?)</(?:div|field)',
        r'class=["\'][^"\']*product_description[^"\']*["\'][^>]*>(.*?)</div>',
    ]
    for pat in patterns:
        m = re.search(pat, raw, re.I | re.S)
        if m:
            text = strip_tags(m.group(1))
            if len(text) > 40:
                return text
    return None


def extract_json_ld(raw: str) -> str | None:
    for m in re.finditer(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        raw,
        re.I | re.S,
    ):
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            desc = item.get("description")
            if isinstance(desc, str) and len(desc.strip()) > 20:
                return strip_tags(desc)
            # ProductGroup / nested
            for key in ("hasVariant", "isVariantOf", "mainEntity"):
                nested = item.get(key)
                if isinstance(nested, dict) and nested.get("description"):
                    return strip_tags(str(nested["description"]))
    return None


def extract_paragraphs(raw: str) -> list[str]:
    # Prefer content near product name / description areas
    chunks = re.findall(r"<(?:p|li)[^>]*>(.*?)</(?:p|li)>", raw, re.I | re.S)
    out: list[str] = []
    seen: set[str] = set()
    for chunk in chunks:
        text = strip_tags(chunk)
        low = text.lower()
        if len(text) < 35 or text in seen:
            continue
        if any(s in low for s in SKIP):
            continue
        if text.count("http") > 2:
            continue
        seen.add(text)
        out.append(text)
    return out


def main() -> None:
    results = {}
    for pid, url in PRODUCTS:
        print(f"\n===== {pid} =====", flush=True)
        try:
            raw = fetch(url)
        except Exception as e:
            print(f"FETCH ERROR: {e}", flush=True)
            results[pid] = {"url": url, "error": str(e)}
            continue

        og = extract_og(raw)
        block = extract_description_block(raw)
        ld = extract_json_ld(raw)
        paras = extract_paragraphs(raw)[:12]

        # Also dump title
        tm = re.search(r"<title>(.*?)</title>", raw, re.I | re.S)
        title = strip_tags(tm.group(1)) if tm else None

        # Look for "Description" section heading then following content
        section = None
        sm = re.search(
            r"(?:Description|Omschrijving|Beschrijving|Опис).{0,80}?</(?:h[1-6]|strong|span)>(.{0,4000}?)</(?:div|section)",
            raw,
            re.I | re.S,
        )
        if sm:
            section = strip_tags(sm.group(1))[:2000]

        entry = {
            "url": url,
            "title": title,
            "og": og,
            "json_ld": ld,
            "block": block,
            "section": section,
            "paragraphs": paras,
        }
        results[pid] = entry
        print("title:", title)
        print("og:", (og or "")[:300])
        print("ld:", (ld or "")[:300])
        print("block:", (block or "")[:300])
        print("section:", (section or "")[:300])
        for i, p in enumerate(paras[:6]):
            print(f"p{i}:", p[:250])

    out = Path(__file__).resolve().parent / "partner-descriptions.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {out}", flush=True)


if __name__ == "__main__":
    main()
