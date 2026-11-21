"""Fix weak Pupasita titles from Amazon URL slugs / sheet group."""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[3]
ENRICHED = ROOT / "backend" / "src" / "scripts" / "data" / "pupasita-enriched.json"
RAW = ROOT / "backend" / "src" / "scripts" / "data" / "pupasita-raw.json"

BAD = re.compile(
    r"^(pupasita product\s*\d*|google image result|robot or human\??|instagram|product)$",
    re.I,
)


def title_from_url(url: str) -> str | None:
    if not url:
        return None
    path = unquote(urlparse(url).path)
    # Amazon: /Brand-Name-Words/dp/ASIN
    m = re.search(r"/([^/]+)/dp/", path)
    if m:
        slug = m.group(1)
        slug = re.sub(r"[-_]+", " ", slug)
        slug = re.sub(r"\s+", " ", slug).strip()
        if len(slug) > 8:
            return slug.title()[:180]
    # generic last path segment
    parts = [p for p in path.split("/") if p and p not in ("en", "nl", "za", "uk", "products", "product-page", "itm")]
    if parts:
        slug = re.sub(r"[-_]+", " ", parts[-1])
        slug = re.sub(r"\.(html?|php)$", "", slug, flags=re.I)
        slug = re.sub(r"\s+", " ", slug).strip()
        if len(slug) > 8 and not slug.isdigit():
            return slug.title()[:180]
    return None


def is_bad(name: str | None) -> bool:
    if not name:
        return True
    return bool(BAD.match(name.strip())) or len(name.strip()) < 6


def main():
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    data = json.loads(ENRICHED.read_text(encoding="utf-8"))
    link_meta = {}
    for sheet in ("curtains", "winter"):
        for row in raw.get(sheet, []):
            link_meta[row["link"]] = row

    fixed = 0
    for p in data["products"]:
        if not is_bad(p.get("name")):
            continue
        src = p.get("sourceLink") or p.get("finalUrl") or ""
        meta = link_meta.get(src) or link_meta.get(p.get("finalUrl") or "")
        name = title_from_url(p.get("finalUrl") or "") or title_from_url(src)
        if not name and meta:
            group = meta.get("group") or p.get("subcategoryName") or "Item"
            name = f"Winter {group} · size {meta.get('size') or 'OS'}"
        if name:
            p["name"] = name
            # refresh slug base lightly if still pup slug
            if "pupasita-product" in (p.get("slug") or ""):
                base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]
                sku = (p.get("id") or "pup").lower()
                p["slug"] = f"{base}-{sku}"
            fixed += 1

    ENRICHED.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"fixed {fixed} titles")


if __name__ == "__main__":
    main()
