"""
Sync curtain (B12-curtains) sheet prices onto furniture products.
Winter collection sheet is ignored.

Rules:
- Column E (actual price) = catalog selling price
- Discounts / compareAt are always cleared (use actual price only)
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[3]
XLSX = ROOT / "Pupasita Data 1 (6).xlsx"
ENRICHED = ROOT / "backend" / "src" / "scripts" / "data" / "pupasita-enriched.json"
PRODUCTS = ROOT / "src" / "data" / "products.json"


def parse_money(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(",", ".")
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else None


def normalize_link(url: str | None) -> str:
    if not url:
        return ""
    return str(url).strip().rstrip("/").lower()


def load_curtain_prices():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb["B12-curtains"] if "B12-curtains" in wb.sheetnames else wb[wb.sheetnames[0]]

    by_code = {}
    by_link = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        code = row[1] if len(row) > 1 else None
        link = row[2] if len(row) > 2 else None
        actual = parse_money(row[4] if len(row) > 4 else None)
        if actual is None:
            continue
        info = {"actual": round(actual, 2), "discount": None}
        try:
            code_i = int(code)
            by_code[code_i] = info
            by_code[f"PUP-FUR-{code_i:03d}"] = info
        except (TypeError, ValueError):
            pass
        if link:
            by_link[normalize_link(link)] = info
    return by_code, by_link


def apply_pricing(product, info):
    actual = info["actual"]
    product["price"] = actual
    product["compareAt"] = None
    if isinstance(product.get("badge"), str) and product["badge"].startswith("-"):
        product["badge"] = None
    return product


def main():
    by_code, by_link = load_curtain_prices()
    print(f"curtain price keys: codes={len(by_code)} links={len(by_link)}")

    enriched = json.loads(ENRICHED.read_text(encoding="utf-8"))
    products_sf = json.loads(PRODUCTS.read_text(encoding="utf-8"))

    matched = 0
    unmatched = []

    for p in enriched.get("products", []):
        if p.get("category") != "furniture":
            continue
        sku = p.get("sku") or (p.get("specs") or {}).get("SKU") or p.get("id")
        info = by_code.get(sku) or by_link.get(
            normalize_link(p.get("sourceLink") or p.get("link"))
        )
        if not info:
            unmatched.append(p.get("slug") or p.get("id"))
            continue
        apply_pricing(p, info)
        p.setdefault("meta", {})
        p["meta"]["Sheet actual price"] = info["actual"]
        p["meta"].pop("Sheet discount price", None)
        matched += 1

    by_id = {
        p.get("id"): p for p in enriched.get("products", []) if p.get("category") == "furniture"
    }
    by_slug = {
        p.get("slug"): p for p in enriched.get("products", []) if p.get("category") == "furniture"
    }
    sf_updated = 0
    for sp in products_sf:
        if sp.get("category") != "furniture":
            continue
        sku = (sp.get("specs") or {}).get("SKU") or sp.get("id")
        src = by_id.get(sp.get("id")) or by_slug.get(sp.get("slug"))
        info = by_code.get(sku)
        if info:
            before = (sp.get("price"), sp.get("compareAt"))
            apply_pricing(sp, info)
            if (sp.get("price"), sp.get("compareAt")) != before:
                sf_updated += 1
        elif src:
            before = (sp.get("price"), sp.get("compareAt"))
            sp["price"] = src["price"]
            sp["compareAt"] = None
            if isinstance(sp.get("badge"), str) and sp["badge"].startswith("-"):
                sp["badge"] = None
            if (sp.get("price"), sp.get("compareAt")) != before:
                sf_updated += 1

    ENRICHED.write_text(json.dumps(enriched, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    PRODUCTS.write_text(json.dumps(products_sf, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"enriched furniture matched: {matched}")
    print(f"storefront furniture updated: {sf_updated}")
    if unmatched:
        print(f"unmatched furniture ({len(unmatched)}):", unmatched[:10])


if __name__ == "__main__":
    main()
