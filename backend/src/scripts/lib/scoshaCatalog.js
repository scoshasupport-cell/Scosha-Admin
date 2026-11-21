const path = require('path');
const fs = require('fs');
const { slugify } = require('../../utils/slugify');
const { parsePriceRange, toUsdPricing } = require('../../utils/priceParse');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../../../..');
const CLOTHES_JSON = path.join(
  WORKSPACE_ROOT,
  'scosha clothes products/website_catalog/products_for_website.json'
);
const FURNITURE_JSON = path.join(
  WORKSPACE_ROOT,
  'scosha products data/scosha_products_catalog.json'
);

/** Clothes-catalog categories that belong under Furniture */
const CLOTHES_TO_FURNITURE = new Set([
  'curtains',
  'cushions & pillowcases',
  'cushions and pillowcases',
  'mattress toppers',
  'mattress topper',
]);

const FURNITURE_SUB_MAP = {
  curtains: { slug: 'curtains', name: 'Curtains' },
  'cushions & pillowcases': { slug: 'cushions-pillowcases', name: 'Cushions & Pillowcases' },
  'cushions and pillowcases': { slug: 'cushions-pillowcases', name: 'Cushions & Pillowcases' },
  'mattress toppers': { slug: 'mattress-toppers', name: 'Mattress Toppers' },
  'mattress topper': { slug: 'mattress-toppers', name: 'Mattress Toppers' },
};

const CLOTHES_SUB_MAP = {
  clothes: { slug: 'apparel', name: 'Apparel' },
  shoes: { slug: 'shoes', name: 'Shoes' },
  bags: { slug: 'bags', name: 'Bags' },
};

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Catalog file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function cleanBrand(raw) {
  if (!raw) return 'Scosha';
  return (
    String(raw)
      .replace(/^Brand:\s*/i, '')
      .replace(/^Visit the\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Scosha'
  );
}

function brandSlug(name) {
  return slugify(name) || 'scosha';
}

function makeSlug(...parts) {
  const base = slugify(parts.filter(Boolean).join(' ')) || 'product';
  return base.slice(0, 160);
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function mapFurnitureSubFromPath(categoryPath) {
  const raw = String(categoryPath || 'Home Decor');
  const leaf = raw.includes('>') ? raw.split('>').pop().trim() : raw.trim();
  const key = normalizeKey(leaf);

  if (key.includes('curtain')) return { slug: 'curtains', name: 'Curtains' };
  if (key.includes('cushion')) return { slug: 'cushion-covers', name: 'Cushion Covers' };
  if (key.includes('blanket') || key.includes('throw')) return { slug: 'blankets', name: 'Blankets' };
  if (key.includes('sheet') || key.includes('pillowcase') || key.includes('bedding')) {
    return { slug: 'bedding', name: 'Bedding' };
  }
  return { slug: slugify(leaf) || 'home-decor', name: leaf || 'Home Decor' };
}

function pickImages(localPaths, remoteUrls, { publicPrefix }) {
  const remotes = (remoteUrls || []).filter((u) => /^https?:\/\//i.test(String(u)));
  const locals = (localPaths || [])
    .filter(Boolean)
    .map((p) => {
      const cleaned = String(p).replace(/\\/g, '/');
      if (/^https?:\/\//i.test(cleaned)) return cleaned;
      return `${publicPrefix}/${cleaned.replace(/^images\//, '')}`;
    });

  // Prefer CDN remotes for scalability; keep locals as fallback
  const merged = [...remotes, ...locals];
  const unique = [...new Set(merged)];
  return unique.slice(0, 12);
}

function buildDetails(bullets, notes) {
  const details = Array.isArray(bullets) ? bullets.filter(Boolean).map(String) : [];
  if (notes && String(notes).trim()) details.push(`Notes: ${String(notes).trim()}`);
  return details;
}

function buildSpecs(attributes = {}, extras = {}) {
  const specs = {};
  for (const [key, value] of Object.entries(attributes || {})) {
    if (value == null || value === '') continue;
    const cleanKey = String(key).replace(/\u200f|\u200e/g, '').trim();
    const cleanVal = String(value).replace(/\u200f|\u200e/g, '').trim();
    if (!cleanKey || !cleanVal) continue;
    // Skip noisy review blobs
    if (/customer reviews|javascript|dpacr/i.test(cleanKey + cleanVal)) continue;
    if (cleanVal.length > 240) continue;
    specs[cleanKey] = cleanVal;
  }
  for (const [key, value] of Object.entries(extras)) {
    if (value != null && String(value).trim()) specs[key] = String(value).trim();
  }
  return specs;
}

function sizesFrom(sizeField) {
  if (!sizeField || !String(sizeField).trim()) return ['OS'];
  const parts = String(sizeField)
    .split(/[,|/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts.slice(0, 8) : ['OS'];
}

function colorsFrom(colorField) {
  const name = colorField && String(colorField).trim() ? String(colorField).trim() : 'Default';
  return [{ name, hex: '#888888' }];
}

function resolveClothesPlacement(categoryName) {
  const key = normalizeKey(categoryName);
  if (CLOTHES_TO_FURNITURE.has(key) || FURNITURE_SUB_MAP[key]) {
    const sub = FURNITURE_SUB_MAP[key] || {
      slug: slugify(categoryName),
      name: categoryName,
    };
    return { parent: 'furniture', parentName: 'Furniture', sub };
  }
  const sub = CLOTHES_SUB_MAP[key] || {
    slug: slugify(categoryName) || 'apparel',
    name: categoryName || 'Apparel',
  };
  return { parent: 'clothes', parentName: 'Clothes', sub };
}

function normalizeClothesItem(item, eurUsdRate) {
  const placement = resolveClothesPlacement(item.category);
  const brandName = cleanBrand(item.brand);
  const parsed = parsePriceRange(item.price);
  // Source catalogs are EU-market; treat numeric prices as EUR even when marked "$"
  const pricing = toUsdPricing(
    { ...parsed, currencyHint: 'EUR' },
    eurUsdRate,
    { assumeEur: true }
  );
  const images = pickImages(item.images, item.image_urls, {
    publicPrefix: '/media/scosha/clothes',
  });
  const colors = colorsFrom(item.color);
  const sizes = sizesFrom(item.size);
  const stock = Number(item.quantity) || 0;

  colors.forEach((c) => {
    c.image = images[0] || '';
    c.image2 = images[1] || images[0] || '';
  });

  const slugBase = item.slug || `${item.name}-${item.sku || item.id}`;
  const slug = makeSlug(slugBase, item.sku || item.id);

  return {
    id: String(item.sku || item.id),
    sku: String(item.sku || item.id),
    slug,
    name: item.name,
    brand: brandSlug(brandName),
    brandName,
    category: placement.parent,
    categoryName: placement.parentName,
    subcategory: placement.sub.slug,
    subcategoryName: placement.sub.name,
    type: placement.sub.name,
    price: pricing.price,
    compareAt: pricing.compareAt,
    badge: stock > 0 && stock <= 3 ? 'Low stock' : null,
    image: images[0] || '',
    image2: images[1] || images[0] || '',
    rating: 0,
    reviews: 0,
    colors,
    sizes,
    description: item.description || item.name,
    details: buildDetails(item.bullets, item.notes),
    specs: buildSpecs(item.attributes, {
      Size: item.size || undefined,
      Color: item.color || undefined,
      SKU: item.sku || item.id,
    }),
    inStock: stock > 0,
    stock,
    tags: [placement.parent, placement.sub.slug, 'scosha', 'new-in'],
    source: 'clothes-catalog',
    pricingMeta: {
      raw: parsed.raw,
      sourceCurrency: pricing.sourceCurrency,
      eurUsdRate,
    },
  };
}

function normalizeFurnitureItem(item, eurUsdRate) {
  const sub = mapFurnitureSubFromPath(item.category);
  const brandName = cleanBrand(item.brand);
  const parsed = parsePriceRange(item.suggested_price);
  const pricing = toUsdPricing(
    { ...parsed, currencyHint: 'EUR' },
    eurUsdRate,
    { assumeEur: true }
  );
  const images = pickImages(item.local_images, item.remote_images, {
    publicPrefix: '/media/scosha/furniture',
  });
  const colors = colorsFrom(item.color);
  const sizes = sizesFrom(item.dimensions || item.pack_size);
  const stock = Number(item.qty) || 0;

  colors.forEach((c) => {
    c.image = images[0] || '';
    c.image2 = images[1] || images[0] || '';
  });

  const slug = makeSlug(item.title, item.sku);

  return {
    id: String(item.sku),
    sku: String(item.sku),
    slug,
    name: item.title,
    brand: brandSlug(brandName),
    brandName,
    category: 'furniture',
    categoryName: 'Furniture',
    subcategory: sub.slug,
    subcategoryName: sub.name,
    type: sub.name,
    price: pricing.price,
    compareAt: pricing.compareAt,
    badge: stock > 0 && stock <= 3 ? 'Low stock' : null,
    image: images[0] || '',
    image2: images[1] || images[0] || '',
    rating: 0,
    reviews: 0,
    colors,
    sizes,
    description: item.description || item.title,
    details: buildDetails(item.bullets, item.nb),
    specs: buildSpecs(item.specifications, {
      Material: item.material || undefined,
      Dimensions: item.dimensions || undefined,
      Color: item.color || undefined,
      Box: item.box || undefined,
      SKU: item.sku,
    }),
    inStock: stock > 0,
    stock,
    tags: ['furniture', sub.slug, 'scosha', item.box ? slugify(item.box) : null, 'new-in'].filter(
      Boolean
    ),
    source: 'furniture-catalog',
    pricingMeta: {
      raw: parsed.raw,
      sourceCurrency: pricing.sourceCurrency,
      eurUsdRate,
    },
  };
}

/**
 * Prefer richer listing when near-duplicates exist across catalogs.
 * Keep both when SKUs differ and titles are not near-identical.
 */
function dedupeProducts(products) {
  const byNormTitle = new Map();
  const kept = [];

  for (const product of products) {
    const key = normalizeKey(product.name).slice(0, 120);
    const existing = byNormTitle.get(key);
    if (!existing) {
      byNormTitle.set(key, product);
      kept.push(product);
      continue;
    }

    // Same title family: keep the one with more images / stock
    const score = (p) =>
      (p.image ? 2 : 0) + (p.details?.length || 0) + (p.stock || 0) + Object.keys(p.specs || {}).length;
    if (score(product) > score(existing)) {
      const idx = kept.findIndex((p) => p.slug === existing.slug);
      if (idx >= 0) kept[idx] = product;
      byNormTitle.set(key, product);
    }
  }

  return kept;
}

function buildCatalogMeta(products) {
  const brandMap = new Map();
  const categoryTree = new Map();
  const collections = new Map();

  const ensureParent = (slug, name) => {
    if (!categoryTree.has(slug)) {
      categoryTree.set(slug, { slug, name, subcategories: new Map() });
    }
    return categoryTree.get(slug);
  };

  // Always include empty Coming Soon parents
  ensureParent('clothes', 'Clothes');
  ensureParent('furniture', 'Furniture');
  ensureParent('skincare', 'Skincare');
  ensureParent('electronics', 'Electronics');

  for (const p of products) {
    brandMap.set(p.brand, {
      slug: p.brand,
      name: p.brandName,
      tagline: p.brandName,
      count: (brandMap.get(p.brand)?.count || 0) + 1,
    });

    const parent = ensureParent(p.category, p.categoryName);
    if (p.subcategory) {
      parent.subcategories.set(p.subcategory, {
        slug: `${p.category}-${p.subcategory}`,
        sub: p.subcategory,
        name: p.subcategoryName,
      });
    }

    const bump = (slug, title, subtitle) => {
      const prev = collections.get(slug) || { slug, title, subtitle, image: p.image, count: 0 };
      prev.count += 1;
      if (!prev.image && p.image) prev.image = p.image;
      collections.set(slug, prev);
    };

    bump('new-in', 'New In', 'Just arrived');
    bump('all', 'All Products', 'Full catalogue');
    bump(p.category, p.categoryName, 'Shop the department');
    bump(`${p.category}-${p.subcategory}`, p.subcategoryName, p.categoryName);
  }

  return {
    brands: [...brandMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    categories: [...categoryTree.values()].map((c, index) => ({
      slug: c.slug,
      name: c.name,
      sortOrder: index,
      subcategories: [...c.subcategories.values()],
    })),
    collections: [
      ...['new-in', 'all', 'clothes', 'furniture'].map((slug) => collections.get(slug)).filter(Boolean),
      ...[...collections.values()].filter(
        (c) => !['new-in', 'all', 'clothes', 'furniture', 'sale', 'best-sellers'].includes(c.slug)
      ),
    ],
  };
}

function loadNormalizedCatalog(eurUsdRate) {
  const clothesRaw = readJson(CLOTHES_JSON);
  const furnitureRaw = readJson(FURNITURE_JSON);

  const clothesProducts = clothesRaw.map((item) => normalizeClothesItem(item, eurUsdRate));
  const furnitureProducts = furnitureRaw.map((item) => normalizeFurnitureItem(item, eurUsdRate));

  // Keep distinct inventory SKUs; only collapse near-identical titles
  const products = dedupeProducts([...clothesProducts, ...furnitureProducts]);
  const meta = buildCatalogMeta(products);

  return {
    products,
    ...meta,
    stats: {
      clothesSource: clothesProducts.length,
      furnitureSource: furnitureProducts.length,
      afterDedupe: products.length,
      clothesTab: products.filter((p) => p.category === 'clothes').length,
      furnitureTab: products.filter((p) => p.category === 'furniture').length,
    },
  };
}

/**
 * Build a catalog object from already-normalized product rows
 * (e.g. pupasita-enriched.json).
 */
function catalogFromNormalizedProducts(products, stats = {}) {
  const meta = buildCatalogMeta(products);
  return {
    products,
    ...meta,
    stats: {
      afterDedupe: products.length,
      clothesTab: products.filter((p) => p.category === 'clothes').length,
      furnitureTab: products.filter((p) => p.category === 'furniture').length,
      ...stats,
    },
  };
}

/**
 * Pupasita import uses sheet prices only — never live scrape price/currency
 * (Amazon/Walmart/etc. live fetches are blocked or unreliable).
 */
function sheetOnlyPrice(item) {
  const sheet = Number(item?.meta?.['Sheet actual price']);
  if (Number.isFinite(sheet) && sheet > 0) return Math.round(sheet * 100) / 100;
  const fallback = Number(item?.price ?? item?.basePrice);
  return Number.isFinite(fallback) && fallback > 0 ? Math.round(fallback * 100) / 100 : 0;
}

function sheetOnlySpecs(item) {
  const specs = { ...(item.specs && typeof item.specs === 'object' ? item.specs : {}) };
  delete specs['Live currency'];
  delete specs['Live price'];
  delete specs['Source URL'];
  if (!specs.SKU) {
    specs.SKU = String(item.id || item.sku || item.slug || '');
  }
  if (item.meta?.['Sheet actual price'] != null) {
    specs['Sheet price'] = item.meta['Sheet actual price'];
  }
  if (item.specs?.['Sheet group']) {
    specs['Sheet group'] = item.specs['Sheet group'];
  }
  return specs;
}

function sheetOnlyDetails(item) {
  const stock = Number(item.stock) || 0;
  const details = [];
  if (stock > 0) details.push(`Stock qty from sheet: ${stock}`);
  details.push('Price source: sheet');
  if (item.specs?.['Sheet group']) {
    details.push(`Sheet group: ${item.specs['Sheet group']}`);
  }
  // Keep non-scrape notes only (drop Source:/Price source: live lines)
  for (const line of item.details || []) {
    const s = String(line || '').trim();
    if (!s) continue;
    if (/^Source:\s*https?:/i.test(s)) continue;
    if (/^Price source:/i.test(s)) continue;
    if (/walmart\.com\/blocked/i.test(s)) continue;
    details.push(s);
  }
  return [...new Set(details)];
}

function loadPupasitaEnrichedCatalog() {
  const enrichedPath = path.join(__dirname, '../data/pupasita-enriched.json');
  const raw = readJson(enrichedPath);
  const list = Array.isArray(raw) ? raw : raw.products || [];

  const products = list.map((item) => {
    const images = [
      item.image,
      item.image2,
      ...(Array.isArray(item.images) ? item.images : []),
    ]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    const colors =
      item.colors?.length > 0
        ? item.colors
        : [{ name: 'Default', hex: '#888888', image: images[0] || '', image2: images[1] || images[0] || '' }];

    colors.forEach((c) => {
      if (!c.image) c.image = images[0] || '';
      if (!c.image2) c.image2 = images[1] || images[0] || '';
    });

    const stock = Number(item.stock) || 0;
    const price = sheetOnlyPrice(item);
    const compareAt = null;

    return {
      id: String(item.id || item.sku || item.slug),
      sku: String(item.specs?.SKU || item.id || item.sku || item.slug),
      slug: item.slug,
      name: item.name,
      brand: item.brand || brandSlug(item.brandName || 'Pupasita'),
      brandName: item.brandName || 'Pupasita',
      category: item.category || 'furniture',
      categoryName: item.categoryName || 'Furniture',
      subcategory: item.subcategory || 'general',
      subcategoryName: item.subcategoryName || item.type || 'General',
      type: item.type || item.subcategoryName || 'General',
      price,
      compareAt,
      badge: item.badge || (stock > 0 && stock <= 3 ? 'Low stock' : null),
      image: images[0] || '',
      image2: images[1] || images[0] || '',
      rating: item.rating || 0,
      reviews: item.reviews || 0,
      colors,
      sizes: item.sizes?.length ? item.sizes : ['OS'],
      description: item.description || item.name,
      details: sheetOnlyDetails(item),
      specs: sheetOnlySpecs(item),
      inStock: stock > 0 || item.inStock === true,
      stock,
      tags: item.tags?.length ? item.tags : [item.category, item.subcategory, 'pupasita', 'new-in'].filter(Boolean),
      source: 'pupasita-sheet',
    };
  });

  return catalogFromNormalizedProducts(products, {
    source: 'pupasita-sheet',
    sourceCount: list.length,
  });
}

module.exports = {
  CLOTHES_JSON,
  FURNITURE_JSON,
  WORKSPACE_ROOT,
  loadNormalizedCatalog,
  loadPupasitaEnrichedCatalog,
  catalogFromNormalizedProducts,
  buildCatalogMeta,
  dedupeProducts,
};
