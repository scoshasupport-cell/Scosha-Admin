"""
Fetch Pupasita catalog from Excel links.
Resolves share.google → product pages, scrapes title/price/images.
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[3]
RAW = ROOT / "backend" / "src" / "scripts" / "data" / "pupasita-raw.json"
OUT = ROOT / "backend" / "src" / "scripts" / "data" / "pupasita-enriched.json"
CACHE = ROOT / "backend" / "src" / "scripts" / "data" / "pupasita-fetch-cache.json"
MIN_IMAGES = 5
MAX_IMAGES = 9

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)

FX = {
    "USD": 1.0,
    "EUR": 1.08,
    "GBP": 1.27,
    "CAD": 0.74,
    "INR": 0.012,
    "AED": 0.27,
    "PKR": 0.0036,
    "ZAR": 0.055,
}

CURRENCY_SYMBOL = {
    "€": "EUR",
    "£": "GBP",
    "$": "USD",
    "₹": "INR",
    "C$": "CAD",
}


def load_json(path: Path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def http_get(url: str, timeout: int = 25) -> tuple[str, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        final = res.geturl()
        raw = res.read()
        charset = "utf-8"
        ctype = res.headers.get_content_charset()
        if ctype:
            charset = ctype
        html = raw.decode(charset, errors="ignore")
        return final, html


def clean_text(s: str | None) -> str:
    if not s:
        return ""
    s = unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_money(text: str) -> tuple[float | None, str | None]:
    if not text:
        return None, None
    t = text.strip()
    cur = None
    for sym, code in CURRENCY_SYMBOL.items():
        if sym in t:
            cur = code
            break
    m = re.search(r"([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)", t)
    if m:
        cur = m.group(1)
        num = m.group(2)
    else:
        m = re.search(r"([0-9]+(?:[.,][0-9]+)?)", t.replace(",", ""))
        if not m:
            m = re.search(r"([0-9]+)[,.]([0-9]{2})", t)
            if not m:
                return None, cur
            return float(f"{m.group(1)}.{m.group(2)}"), cur
        num = m.group(1)
    num = num.replace(",", "")
    try:
        return float(num), cur
    except ValueError:
        return None, cur


def extract_json_ld(html: str) -> list[dict]:
    out = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        blob = m.group(1).strip()
        try:
            data = json.loads(blob)
        except json.JSONDecodeError:
            continue
        if isinstance(data, list):
            out.extend([x for x in data if isinstance(x, dict)])
        elif isinstance(data, dict):
            if "@graph" in data and isinstance(data["@graph"], list):
                out.extend([x for x in data["@graph"] if isinstance(x, dict)])
            else:
                out.append(data)
    return out


def pick_product_ld(nodes: list[dict]) -> dict | None:
    for n in nodes:
        t = n.get("@type")
        types = t if isinstance(t, list) else [t]
        types = [str(x).lower() for x in types if x]
        if "product" in types:
            return n
    return None


def normalize_image_url(url: str) -> str:
    if not url:
        return ""
    u = url.replace("\\u002F", "/").replace("\\/", "/").strip()
    u = unescape(u)
    if u.startswith("//"):
        u = "https:" + u
    u = re.sub(r"\._[A-Z0-9,_]+_\.", "._AC_SL1500_.", u)
    return u


def is_product_image(url: str) -> bool:
    if not url or not url.startswith("http"):
        return False
    low = url.lower()
    if any(
        x in low
        for x in (
            "sprite",
            "icon",
            "logo",
            "pixel",
            "transparent",
            "loading",
            "grey-pixel",
            "1x1",
            "favicon",
            "badge",
        )
    ):
        return False
    if any(
        x in low
        for x in (
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            "images/i/",
            "media-amazon",
            "ssl-images",
            "cdn.shopify",
            "ztat.net",
            "ltwebstatic",
        )
    ):
        return True
    return "image" in low or "/img/" in low or "/images/" in low


def image_dedupe_key(url: str) -> str:
    return re.sub(r"\._[A-Z0-9,_]+_\.", ".", url.lower())


def collect_images(html: str, seed: list[str] | None = None) -> list[str]:
    images: list[str] = list(seed or [])

    for m in re.finditer(
        r'property=["\']og:image(?::url)?["\']\s+content=["\']([^"\']+)["\']',
        html,
        re.I,
    ):
        images.append(m.group(1))
    for m in re.finditer(
        r'content=["\']([^"\']+)["\']\s+property=["\']og:image(?::url)?["\']',
        html,
        re.I,
    ):
        images.append(m.group(1))

    for key in ("hiRes", "large", "mainUrl", "thumb", "hiResImage", "physHeightImageUrl"):
        for m in re.finditer(rf'"{key}"\s*:\s*"(https:[^"]+)"', html):
            images.append(m.group(1))

    for m in re.finditer(r'data-old-hires=["\'](https:[^"\']+)["\']', html, re.I):
        images.append(m.group(1))
    for m in re.finditer(r'data-a-dynamic-image=["\'](\{[^"\']+\})["\']', html, re.I):
        blob = unescape(m.group(1))
        try:
            data = json.loads(blob)
            images.extend(list(data.keys()))
        except json.JSONDecodeError:
            pass

    for m in re.finditer(
        r'(https://(?:m\.media-amazon\.com|images-na\.ssl-images-amazon\.com|cdn\.shopify\.com|img\.ltwebstatic\.com|img01\.ztat\.net)[^"\'\s<>]+)',
        html,
        re.I,
    ):
        images.append(m.group(1))

    seen: set[str] = set()
    uniq: list[str] = []
    for raw in images:
        img = normalize_image_url(raw)
        if not is_product_image(img):
            continue
        key = image_dedupe_key(img)
        if key in seen:
            continue
        seen.add(key)
        uniq.append(img)
        if len(uniq) >= MAX_IMAGES:
            break
    return uniq


def needs_refresh(cached: dict | None) -> bool:
    if not cached or not cached.get("finalUrl"):
        return True
    if cached.get("error"):
        return True
    imgs = cached.get("images") or []
    return len(imgs) < MIN_IMAGES


def scrape_product(url: str) -> dict:
    final, html = http_get(url)
    title = None
    m = re.search(r'property=["\']og:title["\']\s+content=["\']([^"\']+)["\']', html, re.I)
    if m:
        title = clean_text(m.group(1))
    if not title:
        m = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
        if m:
            title = clean_text(m.group(1))
            title = re.sub(
                r"\s*[:|\-].*(Amazon|eBay|Walmart|Zalando|Temu).*$",
                "",
                title,
                flags=re.I,
            ).strip()

    images: list[str] = []
    price = None
    currency = None
    ld = pick_product_ld(extract_json_ld(html))
    if ld:
        if not title and ld.get("name"):
            title = clean_text(str(ld["name"]))
        offers = ld.get("offers")
        if isinstance(offers, list) and offers:
            offers = offers[0]
        if isinstance(offers, dict):
            p = offers.get("price") or offers.get("lowPrice")
            currency = offers.get("priceCurrency") or currency
            if p is not None:
                try:
                    price = float(str(p).replace(",", ""))
                except ValueError:
                    pass
        imgs = ld.get("image")
        if isinstance(imgs, str):
            images.append(imgs)
        elif isinstance(imgs, list):
            for item in imgs:
                if isinstance(item, str):
                    images.append(item)
                elif isinstance(item, dict) and item.get("url"):
                    images.append(str(item["url"]))

    if price is None:
        for pat in [
            r'id="priceblock_ourprice"[^>]*>\s*([^<]+)',
            r'id="priceblock_dealprice"[^>]*>\s*([^<]+)',
            r'class="a-price"[^>]*>.*?class="a-offscreen">([^<]+)',
            r'data-a-color="price"[^>]*>.*?([£€$₹]\s*[0-9][0-9.,]*)',
            r'"displayPrice"\s*:\s*"([^"]+)"',
            r'"priceAmount"\s*:\s*([0-9]+(?:\.[0-9]+)?)',
            r'itemprop="price"\s+content="([^"]+)"',
            r'property="product:price:amount"\s+content="([^"]+)"',
        ]:
            mm = re.search(pat, html, re.I | re.S)
            if not mm:
                continue
            val = mm.group(1)
            if re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", val.strip()):
                price = float(val)
                break
            p2, c2 = parse_money(val)
            if p2 is not None:
                price = p2
                currency = currency or c2
                break

    if not currency:
        m = re.search(r'"currency"\s*:\s*"([A-Z]{3})"', html)
        if m:
            currency = m.group(1)
        else:
            host = urlparse(final).netloc.lower()
            if ".co.uk" in host or "zalando.co.uk" in host:
                currency = "GBP"
            elif any(x in host for x in (".de", ".fr", ".es", ".it", ".be", "zalando.de")):
                currency = "EUR"
            elif ".ca" in host:
                currency = "CAD"
            elif ".in" in host or "thecraze.in" in host:
                currency = "INR"
            elif ".ae" in host:
                currency = "AED"
            else:
                currency = "USD"

    uniq = collect_images(html, images)

    brand = None
    m = re.search(r'id="bylineInfo"[^>]*>\s*([^<]+)', html, re.I)
    if m:
        brand = clean_text(re.sub(r"^(Brand:\s*|Visit the\s+|Store\s*)", "", m.group(1), flags=re.I))
    if not brand and ld and ld.get("brand"):
        b = ld["brand"]
        if isinstance(b, dict):
            brand = clean_text(str(b.get("name") or ""))
        else:
            brand = clean_text(str(b))

    description = None
    m = re.search(
        r'property=["\']og:description["\']\s+content=["\']([^"\']+)["\']', html, re.I
    )
    if m:
        description = clean_text(m.group(1))

    return {
        "finalUrl": final,
        "title": title or "Product",
        "brand": brand or "Pupasita",
        "price": price,
        "currency": currency,
        "images": uniq[:MAX_IMAGES],
        "description": description or "",
    }


def to_usd(amount: float | None, currency: str | None) -> float | None:
    if amount is None:
        return None
    rate = FX.get((currency or "USD").upper(), 1.0)
    return round(amount * rate, 2)


def detect_gender(text: str) -> str:
    t = text.lower()
    if re.search(r"\b(kids?|child|children|boy|girl|junior|toddler)\b", t):
        return "kids"
    if re.search(r"\b(men'?s?|menswear|male|gentleman)\b", t) and not re.search(
        r"\b(women|woman|ladies|lady)\b", t
    ):
        return "men"
    if re.search(r"\b(women'?s?|woman|ladies|lady|female|girl'?s)\b", t):
        return "women"
    return "women"


def furniture_sub(group: str) -> tuple[str, str]:
    g = (group or "").lower()
    if "matress" in g or "mattress" in g:
        return "mattress-toppers", "Mattress Toppers"
    return "curtains", "Curtains"


def clothes_sub(group: str, title: str, url: str) -> tuple[str, str]:
    g = (group or "").lower()
    blob = f"{g} {title} {url}"
    if "shoe" in g or "shoe" in title.lower() or "sneaker" in title.lower() or "boot" in title.lower():
        gender = detect_gender(blob)
        return f"{gender}-shoes", f"{gender.title()} Shoes"
    if "bag" in g:
        gender = detect_gender(blob)
        return f"{gender}-bags", f"{gender.title()} Bags"
    gender = detect_gender(blob)
    return gender, gender.title()


def sheet_price_fallback(raw) -> float | None:
    if raw is None:
        return None
    text = str(raw)
    nums = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", text.replace(",", "."))]
    if not nums:
        return None
    mid = (min(nums) + max(nums)) / 2
    if "$" in text or "usd" in text.lower():
        return round(mid, 2)
    return round(mid, 2)


def main():
    raw = load_json(RAW, {"curtains": [], "winter": []})
    cache = load_json(CACHE, {})
    products = []

    def enrich(row: dict, department: str, idx: int):
        link = row["link"]
        key = link
        cached = cache.get(key)
        if needs_refresh(cached):
            try:
                print(f"[{idx}] fetch ({len((cached or {}).get('images') or [])} imgs) {link[:60]}...")
                scraped = scrape_product(link)
                # Keep previous images if new scrape somehow returned fewer
                prev = (cached or {}).get("images") or []
                if len(scraped.get("images") or []) < len(prev):
                    scraped["images"] = list(
                        dict.fromkeys([*(scraped.get("images") or []), *prev])
                    )[:MAX_IMAGES]
                cached = scraped
                cache[key] = scraped
                save_json(CACHE, cache)
                time.sleep(1.4)
            except Exception as e:
                print(f"  FAIL {e}")
                if not cached:
                    cached = {
                        "finalUrl": link,
                        "title": None,
                        "brand": "Pupasita",
                        "price": None,
                        "currency": None,
                        "images": [],
                        "description": "",
                        "error": str(e),
                    }
                else:
                    cached = {**cached, "error": str(e)}
                cache[key] = cached
                save_json(CACHE, cache)

        title = cached.get("title") or f"Pupasita product {idx}"
        live_usd = to_usd(cached.get("price"), cached.get("currency"))
        fallback = sheet_price_fallback(row.get("sheet_price"))
        price = live_usd if live_usd and live_usd > 0 else fallback
        price_source = "live" if live_usd and live_usd > 0 else "sheet_fallback"

        if department == "furniture":
            sub, sub_name = furniture_sub(row.get("group") or "")
            category, category_name = "furniture", "Furniture"
        else:
            sub, sub_name = clothes_sub(
                row.get("group") or "", title, cached.get("finalUrl") or link
            )
            category, category_name = "clothes", "Clothes"

        qty = row.get("qty")
        try:
            stock = max(0, int(float(qty)))
        except (TypeError, ValueError):
            stock = 1

        size = row.get("size")
        if size is not None and str(size).strip():
            sizes = [str(size).strip().upper()]
        else:
            sizes = ["OS"]

        images = list(dict.fromkeys(cached.get("images") or []))[:MAX_IMAGES]
        image = images[0] if images else ""
        image2 = images[1] if len(images) > 1 else image

        sku = f"PUP-{department[:3].upper()}-{idx:03d}"
        slug_base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80] or "product"

        products.append(
            {
                "id": sku,
                "slug": f"{slug_base}-{sku.lower()}",
                "name": title[:180],
                "brand": re.sub(
                    r"[^a-z0-9]+", "-", (cached.get("brand") or "pupasita").lower()
                ).strip("-")
                or "pupasita",
                "brandName": cached.get("brand") or "Pupasita",
                "category": category,
                "categoryName": category_name,
                "subcategory": sub,
                "subcategoryName": sub_name,
                "type": sub_name,
                "price": price or 0,
                "compareAt": None,
                "badge": "New",
                "image": image,
                "image2": image2,
                "images": images,
                "rating": 0,
                "reviews": 0,
                "colors": [
                    {
                        "name": "Default",
                        "hex": "#888888",
                        "image": image,
                        "image2": image2,
                    }
                ],
                "sizes": sizes,
                "description": cached.get("description")
                or f"{title} — {category_name} / {sub_name}.",
                "details": [
                    f"Source: {cached.get('finalUrl') or link}",
                    f"Stock qty from sheet: {stock}",
                    f"Price source: {price_source}",
                ]
                + ([f"Notes: {row['nb']}"] if row.get("nb") else []),
                "specs": {
                    "SKU": sku,
                    "Source URL": cached.get("finalUrl") or link,
                    "Sheet group": row.get("group") or "",
                    "Live currency": cached.get("currency") or "",
                    "Live price": cached.get("price"),
                },
                "inStock": stock > 0,
                "stock": stock,
                "tags": [category, sub, "pupasita", "new-in"],
                "sourceLink": link,
                "finalUrl": cached.get("finalUrl") or link,
                "priceSource": price_source,
            }
        )

    i = 1
    for row in raw.get("curtains", []):
        enrich(row, "furniture", i)
        i += 1
    for row in raw.get("winter", []):
        enrich(row, "clothes", i)
        i += 1

    summary = {
        "total": len(products),
        "furniture": sum(1 for p in products if p["category"] == "furniture"),
        "clothes": sum(1 for p in products if p["category"] == "clothes"),
        "livePrices": sum(1 for p in products if p["priceSource"] == "live"),
        "sheetFallback": sum(1 for p in products if p["priceSource"] == "sheet_fallback"),
        "with5plusImages": sum(1 for p in products if len(p.get("images") or []) >= MIN_IMAGES),
        "subs": {},
    }
    for p in products:
        key = f"{p['category']}/{p['subcategory']}"
        summary["subs"][key] = summary["subs"].get(key, 0) + 1

    save_json(OUT, {"summary": summary, "products": products})
    print(json.dumps(summary, indent=2))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
