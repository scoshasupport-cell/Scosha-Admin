/**
 * Normalized, in-memory catalog index for the AI assistant.
 *
 * Subcategory slugs in the DB are unreliable (e.g. `furniture-curtains` contains blankets, bed sheets
 * and cushion covers; `clothes-women-bags` contains heated gloves; `clothes-apparel` mixes genders).
 * Every product is therefore classified from its own text (name + description + tags + variants) into:
 *   domain       home | fashion | beauty | other
 *   productType  canonical type (curtain, cushion-cover, blanket, jacket, sneaker, ...)
 *   slot         upper | lower | full | shoes | bag | head | face | hands | neck | home | beauty
 *   gender       men | women | unisex | unknown   (fashion only; home is unisex)
 *   colors       color names + families found in text / variants
 *   materials, styleTags, sizes (with stock)
 *
 * The index is rebuilt at most every CACHE_TTL_MS and shared across requests.
 */
const { prisma } = require('../config/prisma');
const { mapProduct, toNumber } = require('../utils/prismaHelpers');

const CACHE_TTL_MS = 5 * 60 * 1000;

const PRODUCT_INCLUDE = {
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  subCategory: { select: { id: true, name: true, slug: true } },
  variants: true,
};

/* ------------------------------------------------------------------------------------------------
 * Vocabularies
 * ---------------------------------------------------------------------------------------------- */

/** Ordered: first match wins, so compound/specific types come before generic ones. */
const TYPE_RULES = [
  // ---- home ----
  { type: 'mattress-topper', domain: 'home', slot: 'home', re: /\bmattress\s*topper|\btopper\b.*\bmemory foam|\bmemory foam\b.*\btopper/i },
  { type: 'bedsheet', domain: 'home', slot: 'home', re: /\bbed ?sheets?\b|\bsheet set|\bfitted sheet|\bflat sheet|\bduvet|\bbedding\b/i },
  { type: 'cushion-cover', domain: 'home', slot: 'home', re: /\bcushions?\b|\bpillow\s*(cover|case|cases|covers)|\bthrow pillows?\b|\bscatter\b/i },
  { type: 'blanket', domain: 'home', slot: 'home', re: /\bblanket|\bthrow\b(?!\s*pillow)|\bfleece\b(?!.*jacket)|\bcouch blanket|\bsofa blanket/i },
  { type: 'curtain', domain: 'home', slot: 'home', re: /\bcurtain|\brideau|\bvoile|\bdraper|\bdrapes?\b|\bnet curtain|\bblackout\b|\bgrommet\b|\beyelets?\b.*\bpanel|\bpanels?\b.*\bwindow/i },
  { type: 'rug', domain: 'home', slot: 'home', re: /\brug\b|\bcarpet\b/i },
  { type: 'decor', domain: 'home', slot: 'home', re: /\bvase\b|\bwall art\b|\bcandle\b|\blamp\b|\bdecor\b/i },
  // ---- beauty ----
  { type: 'sunscreen', domain: 'beauty', slot: 'beauty', re: /\bspf\b|\bsunscreen|\bsun cream/i },
  { type: 'serum', domain: 'beauty', slot: 'beauty', re: /\bserum\b|\bampoule/i },
  { type: 'moisturizer', domain: 'beauty', slot: 'beauty', re: /\bmoisturi[sz]er|\bface cream|\bhydrating cream|\blotion\b/i },
  { type: 'cleanser', domain: 'beauty', slot: 'beauty', re: /\bcleanser|\bface wash|\bmicellar/i },
  { type: 'mask', domain: 'beauty', slot: 'beauty', re: /\bface mask|\bsheet mask|\bclay mask/i },
  { type: 'toner', domain: 'beauty', slot: 'beauty', re: /\btoner\b|\bessence\b/i },
  { type: 'makeup', domain: 'beauty', slot: 'beauty', re: /\blipstick|\bmascara|\bfoundation\b|\bconcealer|\bblush\b|\beyeliner|\bmakeup/i },
  // ---- fashion accessories (before apparel so "sunglasses" is not swallowed by "glass") ----
  { type: 'sunglasses', domain: 'fashion', slot: 'face', re: /\bsunglass|\beyeglass|\baviator sunglasses|\beyewear\b/i },
  { type: 'hat', domain: 'fashion', slot: 'head', re: /\bhat\b|\bcap\b|\bbeanie|\bberet|\bfedora|\bbucket hat|\bvisor\b/i },
  { type: 'scarf', domain: 'fashion', slot: 'neck', re: /\bscarf|\bscarves|\bshawl\b(?!\s*(collar|lapel|wide))|\bstole\b/i },
  { type: 'gloves', domain: 'fashion', slot: 'hands', re: /\bgloves?\b|\bmittens?\b/i },
  { type: 'belt', domain: 'fashion', slot: 'waist', re: /\bbelt\b/i },
  { type: 'backpack', domain: 'fashion', slot: 'bag', re: /\bbackpack|\brucksack/i },
  { type: 'travel-bag', domain: 'fashion', slot: 'bag', re: /\bflight bag|\btravel bag|\bduffel|\bduffle|\bweekender|\bluggage|\bsuitcase/i },
  { type: 'shoulder-bag', domain: 'fashion', slot: 'bag', re: /\bshoulder bag|\bhandbag|\bpurse\b|\btote\b|\bcrossbody|\bclutch\b|\bsatchel|\bbag\b/i },
  // ---- footwear ----
  { type: 'boot', domain: 'fashion', slot: 'shoes', re: /\bboots?\b|\bchukka|\bchelsea\b/i },
  { type: 'sneaker', domain: 'fashion', slot: 'shoes', re: /\bsneakers?\b|\btrainers?\b|\brunning shoes?|\bwalking shoes?|\btennis shoes?|\bjogging shoes?|\bathletic shoes?/i },
  { type: 'loafer', domain: 'fashion', slot: 'shoes', re: /\bloafers?\b|\bslip-?ons?\b.*\bshoe|\bmoccasin/i },
  { type: 'dance-shoe', domain: 'fashion', slot: 'shoes', re: /\bdance shoes?|\bballroom|\bsalsa|\blatin shoes?/i },
  { type: 'sandal', domain: 'fashion', slot: 'shoes', re: /\bsandals?\b|\bslides?\b|\bflip[- ]flops?/i },
  { type: 'flat', domain: 'fashion', slot: 'shoes', re: /\bballet flats?|\bballerina|\bflats?\b.*\bshoes?|\bflat shoes?/i },
  { type: 'heel', domain: 'fashion', slot: 'shoes', re: /\bheels?\b|\bpumps?\b|\bstiletto/i },
  { type: 'shoe', domain: 'fashion', slot: 'shoes', re: /\bshoes?\b|\bfootwear\b/i },
  // ---- full-body / sets ----
  { type: 'tracksuit', domain: 'fashion', slot: 'full', re: /\btracksuit|\btrack suit|\bjogging suit/i },
  { type: 'suit', domain: 'fashion', slot: 'full', re: /\btuxedo|\bsuit\b(?!\s*(jacket|vest|case))|\b(jacket|blazer)\s*\+\s*(trousers|pants)/i },
  { type: 'set', domain: 'fashion', slot: 'full', re: /\b(2|two|3|three)[- ]piece\b|\bpiece set\b|\bco-?ord\b|\bmatching set|\bskirt set|\bpants? set|\btop set|\bset\b.*\b(skirt|pants?|trousers)\b.*\b(top|blazer|shirt|jacket)|\b(skirt|pants?|trousers)\b.*&.*\b(top|blazer|shirt)\b/i },
  { type: 'dress', domain: 'fashion', slot: 'full', re: /\bdress\b(?!\s*(shirt|shoes?|pants|trousers|socks))|\bgown\b|\bjumpsuit|\bromper|\bfrock\b(?!\s*coat)/i },
  // ---- lower ----
  { type: 'jeans', domain: 'fashion', slot: 'lower', re: /\bjeans?\b|\bdenim (pants|trousers)/i },
  { type: 'skirt', domain: 'fashion', slot: 'lower', re: /\bskirt/i },
  { type: 'shorts', domain: 'fashion', slot: 'lower', re: /\bshorts\b/i },
  { type: 'leggings', domain: 'fashion', slot: 'lower', re: /\bleggings?\b|\btights\b/i },
  { type: 'pants', domain: 'fashion', slot: 'lower', re: /\bpants?\b|\btrousers?\b|\bchinos?\b|\bjoggers?\b|\bslacks\b/i },
  // ---- upper ----
  { type: 'coat', domain: 'fashion', slot: 'upper', re: /\bcoat\b|\bparka|\btrench|\bovercoat|\bpea coat|\bpuffer\b|\bdown jacket|\bquilted jacket/i },
  { type: 'jacket', domain: 'fashion', slot: 'upper', re: /\bjacket|\bblazer|\bbomber|\bwindbreaker|\banorak|\bvarsity/i },
  { type: 'vest', domain: 'fashion', slot: 'upper', re: /\bvest\b|\bwaistcoat|\bgilet/i },
  { type: 'hoodie', domain: 'fashion', slot: 'upper', re: /\bhoodie|\bhooded sweatshirt|\bsweatshirt/i },
  { type: 'cardigan', domain: 'fashion', slot: 'upper', re: /\bcardigan/i },
  { type: 'sweater', domain: 'fashion', slot: 'upper', re: /\bsweater|\bpullover|\bjumper\b|\bknitwear|\bknit\b.*\btop/i },
  { type: 'shirt', domain: 'fashion', slot: 'upper', re: /\bshirt\b|\bblouse|\bbutton[- ]?(down|up)/i },
  { type: 'top', domain: 'fashion', slot: 'upper', re: /\bt-?shirt|\btee\b|\btop\b|\btank\b|\bcamisole|\btunic/i },
];

const COLOR_FAMILIES = {
  black: ['black', 'jet', 'onyx', 'charcoal black'],
  white: ['white', 'off-white', 'off white', 'snow', 'crème', 'creme', 'whtie'],
  ivory: ['ivory', 'cream', 'ecru', 'eggshell', 'vanilla'],
  beige: ['beige', 'sand', 'oatmeal', 'nude', 'taupe', 'stone'],
  brown: ['brown', 'chocolate', 'coffee', 'mocha', 'espresso', 'walnut', 'chestnut', 'cognac', 'caramel'],
  tan: ['tan', 'camel', 'khaki', 'honey', 'light brown'],
  grey: ['grey', 'gray', 'charcoal', 'slate', 'silver', 'ash', 'heather', 'light grey', 'dark grey', 'light gray', 'dark gray'],
  navy: ['navy', 'navy blue', 'midnight', 'dark blue', 'indigo'],
  blue: ['blue', 'light blue', 'sky blue', 'cobalt', 'royal blue', 'denim', 'teal blue', 'baby blue', 'powder blue', 'steel blue'],
  teal: ['teal', 'turquoise', 'aqua', 'cyan', 'petrol'],
  green: ['green', 'olive', 'olive green', 'sage', 'sage green', 'forest green', 'dark green', 'army green', 'emerald', 'mint', 'basil', 'moss', 'khaki green', 'varan chine', 'lime'],
  yellow: ['yellow', 'mustard', 'lemon', 'gold', 'golden', 'ochre', 'amber'],
  orange: ['orange', 'rust', 'terracotta', 'burnt orange', 'apricot', 'peach', 'coral', 'copper'],
  red: ['red', 'burgundy', 'wine', 'maroon', 'crimson', 'scarlet', 'cherry', 'ruby', 'brick'],
  pink: ['pink', 'blush', 'rose', 'fuchsia', 'magenta', 'mauve', 'dusty pink', 'candy pink', 'hot pink'],
  purple: ['purple', 'lavender', 'lilac', 'violet', 'plum', 'aubergine'],
  multicolor: ['multicolor', 'multi-color', 'colorful', 'colourful', 'rainbow', 'printed', 'plaid', 'check', 'striped', 'nova check', 'gradient'],
};

const COLOR_LOOKUP = (() => {
  const entries = [];
  for (const [family, names] of Object.entries(COLOR_FAMILIES)) {
    for (const name of names) entries.push({ name, family });
    entries.push({ name: family, family });
  }
  // longest first so "sage green" beats "green"
  entries.sort((a, b) => b.name.length - a.name.length);
  return entries;
})();

const MATERIALS = [
  'linen', 'velvet', 'corduroy', 'chenille', 'cotton', 'organic cotton', 'fleece', 'wool', 'tweed', 'leather',
  'faux leather', 'pu leather', 'suede', 'denim', 'knit', 'knitted', 'cable knit', 'satin', 'silk', 'polyester',
  'mesh', 'memory foam', 'plush', 'teddy', 'sateen', 'voile', 'sheer', 'canvas', 'oxford', 'nylon', 'cashmere',
  'down jacket', 'quilted', 'puffer',
];

const PLACEHOLDER_NAME_RE = /^\s*(product|item|untitled|test)\s*\d*\s*$/i;

const STYLE_TAGS = [
  'boho', 'vintage', 'retro', 'modern', 'minimal', 'minimalist', 'farmhouse', 'scandinavian', 'classic', 'elegant',
  'casual', 'formal', 'business', 'office', 'sporty', 'athletic', 'streetwear', 'oversized', 'slim fit', 'regular fit',
  'straight fit', 'wide leg', 'winter', 'summer', 'autumn', 'spring', 'outdoor', 'hiking', 'wedding', 'party',
  'medieval', 'gothic', 'steampunk', 'luxury', 'cozy', 'warm', 'lightweight', 'waterproof', 'blackout', 'translucent',
  'motorcycle', 'biker', 'dance', 'college', 'preppy',
];

const HOME_USE = {
  'cushion-cover': ['sofa', 'couch', 'armchair', 'bed', 'living room', 'bedroom'],
  blanket: ['sofa', 'couch', 'bed', 'living room', 'bedroom'],
  curtain: ['window', 'living room', 'bedroom', 'kitchen', 'door'],
  bedsheet: ['bed', 'bedroom', 'mattress'],
  'mattress-topper': ['bed', 'mattress', 'bedroom'],
  rug: ['floor', 'living room', 'bedroom'],
  decor: ['shelf', 'table', 'living room'],
};

const LETTER_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL'];

/* ------------------------------------------------------------------------------------------------
 * Classification helpers
 * ---------------------------------------------------------------------------------------------- */

function textOf(product) {
  const tags = Array.isArray(product.tags) ? product.tags : [];
  const desc = typeof product.description === 'string' ? product.description : '';
  const details = product.details && typeof product.details === 'object' ? JSON.stringify(product.details) : '';
  return [product.name, desc.slice(0, 1200), ...tags, details.slice(0, 400)].filter(Boolean).join(' \n ');
}

function classifyType(product) {
  const name = String(product.name || '');
  const desc = typeof product.description === 'string' ? product.description.slice(0, 600) : '';
  const subSlug = String(product.subCategory?.slug || '');
  const catSlug = String(product.category?.slug || '');

  // Names are far more reliable than slugs or descriptions; try the name first, then description.
  for (const source of [name, desc]) {
    for (const rule of TYPE_RULES) {
      if (rule.re.test(source)) return { ...rule, source: source === name ? 'name' : 'description' };
    }
  }
  // Last resort: slug hints
  if (/furniture/.test(catSlug) || /furniture/.test(subSlug)) {
    if (/cushion/.test(subSlug)) return { type: 'cushion-cover', domain: 'home', slot: 'home', source: 'slug' };
    if (/topper/.test(subSlug)) return { type: 'mattress-topper', domain: 'home', slot: 'home', source: 'slug' };
    if (/curtain/.test(subSlug)) return { type: 'curtain', domain: 'home', slot: 'home', source: 'slug' };
    return { type: 'decor', domain: 'home', slot: 'home', source: 'slug' };
  }
  if (/shoes/.test(subSlug)) return { type: 'shoe', domain: 'fashion', slot: 'shoes', source: 'slug' };
  if (/bags/.test(subSlug)) return { type: 'shoulder-bag', domain: 'fashion', slot: 'bag', source: 'slug' };
  if (/skincare|beauty/.test(catSlug)) return { type: 'skincare', domain: 'beauty', slot: 'beauty', source: 'slug' };
  if (/clothes/.test(catSlug)) return { type: 'apparel', domain: 'fashion', slot: 'upper', source: 'slug' };
  return { type: 'unknown', domain: 'other', slot: null, source: 'none' };
}

function inferGender(product, domain) {
  if (domain === 'home') return 'unisex';
  const sub = String(product.subCategory?.slug || '').toLowerCase();
  const cat = String(product.category?.slug || '').toLowerCase();
  const name = String(product.name || '');
  const text = textOf(product);

  const nameWomen = /\bwomen'?s?\b|\bwoman\b|\bladies\b|\blady\b|\bgirls?\b|\bfemale\b|\bfemini\b/i.test(name);
  const nameMen = /\bmen'?s?\b|\bman\b|\bmens\b|\bgents?\b|\bmale\b|\bboys?\b/i.test(name) && !/\bwomen'?s?\b|\bwoman\b/i.test(name);
  const nameUnisex = /\bunisex\b/i.test(name);

  // Gender-strict: an explicit "Men's"/"Women's" label wins over a trailing "Unisex" keyword.
  if (nameWomen && nameMen) return 'unisex';
  if (nameWomen) return 'women';
  if (nameMen) return 'men';
  if (nameUnisex) return 'unisex';

  // Fall back to the slug tree, then description
  if (/(^|-)women(-|$)/.test(sub) || /(^|-)women(-|$)/.test(cat)) return 'women';
  if (/(^|-)men(-|$)/.test(sub) || /(^|-)men(-|$)/.test(cat)) return 'men';

  const descWomen = /\bwomen'?s?\b|\bladies\b|\bfemale\b/i.test(text);
  const descMen = /\bmen'?s?\b|\bgents?\b|\bmale\b/i.test(text) && !descWomen;
  if (descWomen && !descMen) return 'women';
  if (descMen) return 'men';
  if (/\bunisex\b/i.test(text)) return 'unisex';
  return 'unknown';
}

function extractColors(text, variants = []) {
  const found = new Map(); // name -> family
  const lower = String(text || '').toLowerCase();
  for (const { name, family } of COLOR_LOOKUP) {
    if (name.length < 3) continue;
    const re = new RegExp(`(^|[^a-z])${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z]|$)`, 'i');
    if (re.test(lower)) found.set(name, family);
  }
  for (const v of variants) {
    const cn = String(v.colorName || '').toLowerCase().trim();
    if (!cn || cn === 'default' || cn === 'standard' || cn === 'one color') continue;
    for (const { name, family } of COLOR_LOOKUP) {
      if (cn === name || cn.includes(name)) {
        found.set(name, family);
        break;
      }
    }
  }
  const names = [...found.keys()];
  const families = [...new Set(found.values())];
  return { names, families };
}

function extractList(text, vocab) {
  const lower = String(text || '').toLowerCase();
  return vocab.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z]|$)`).test(lower));
}

function normalizeSize(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return { label: '', kind: 'none' };
  if (s === 'OS' || s === 'ONE SIZE' || s === 'ONESIZE' || s === 'FREE' || s === 'STANDARD') return { label: 'OS', kind: 'one-size' };
  if (LETTER_SIZES.includes(s)) return { label: s === '2XL' ? 'XXL' : s === '3XL' ? 'XXXL' : s, kind: 'letter' };
  if (/^(XS|S|M|L|XL)-(S|M|L|XL|XXL)$/.test(s)) return { label: s, kind: 'letter-range' };
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  if (Number.isFinite(n)) {
    if (n >= 34 && n <= 50) return { label: String(n), kind: 'eu-shoe', value: n };
    if (n >= 3 && n <= 16) return { label: String(n), kind: 'us-shoe', value: n };
    if (n >= 24 && n <= 44) return { label: String(n), kind: 'waist-in', value: n };
    return { label: s, kind: 'numeric', value: n };
  }
  if (/\d+\s*[x*]\s*\d+/i.test(s)) return { label: s, kind: 'dimension' };
  return { label: s, kind: 'other' };
}

function primaryImage(images) {
  if (!Array.isArray(images)) return '';
  const first = images[0];
  if (!first) return '';
  if (typeof first === 'string') return first;
  return first.url || first.src || '';
}

/* ------------------------------------------------------------------------------------------------
 * Index build
 * ---------------------------------------------------------------------------------------------- */

function toCatalogItem(product) {
  const mapped = mapProduct(product);
  const cls = classifyType(product);
  const text = textOf(product);
  const activeVariants = (product.variants || []).filter((v) => v.status === 'active');
  const sizes = activeVariants.map((v) => {
    const norm = normalizeSize(v.size);
    return {
      variantId: String(v.id),
      size: String(v.size || ''),
      label: norm.label,
      kind: norm.kind,
      value: norm.value ?? null,
      stock: Number(v.stock) || 0,
      price: toNumber(v.price ?? mapped.basePrice),
      colorName: v.colorName && v.colorName !== 'Default' ? v.colorName : null,
      colorHex: v.colorHex || null,
      inStock: (Number(v.stock) || 0) > 0,
    };
  });
  const totalStock = sizes.reduce((s, v) => s + v.stock, 0);
  const colors = extractColors(`${product.name} ${typeof product.description === 'string' ? product.description.slice(0, 300) : ''}`, activeVariants);
  const images = Array.isArray(mapped.images) ? mapped.images : [];

  return {
    id: String(mapped.id),
    slug: mapped.slug,
    name: String(mapped.name || ''),
    nameKey: String(mapped.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60),
    description: typeof mapped.description === 'string' ? mapped.description : '',
    text: text.toLowerCase(),
    brand: mapped.brand?.name || 'Scosha',
    price: toNumber(mapped.basePrice),
    compareAtPrice: mapped.comparePrice != null ? toNumber(mapped.comparePrice) : null,
    image: primaryImage(images),
    images,
    categorySlug: mapped.category?.slug || '',
    categoryName: mapped.category?.name || '',
    subCategorySlug: mapped.subCategory?.slug || '',
    subCategoryName: mapped.subCategory?.name || '',
    domain: cls.domain,
    productType: cls.type,
    slot: cls.slot,
    typeSource: cls.source,
    gender: inferGender(product, cls.domain),
    colors: colors.names,
    colorFamilies: colors.families,
    materials: extractList(text, MATERIALS),
    styleTags: extractList(text, STYLE_TAGS),
    homeUse: HOME_USE[cls.type] || [],
    sizes,
    inStockSizes: sizes.filter((s) => s.inStock),
    totalStock,
    inStock: totalStock > 0,
    hasImage: Boolean(primaryImage(images)),
    isPlaceholder: PLACEHOLDER_NAME_RE.test(String(mapped.name || '')),
    /** Only items that can actually be shown to a customer. */
    sellable: totalStock > 0 && Boolean(primaryImage(images)) && !PLACEHOLDER_NAME_RE.test(String(mapped.name || '')),
  };
}

let cache = { builtAt: 0, items: [], byId: new Map(), building: null };

async function buildIndex() {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    include: PRODUCT_INCLUDE,
    take: 2000,
  });
  const items = products.map(toCatalogItem);
  const byId = new Map(items.map((i) => [i.id, i]));
  cache = { builtAt: Date.now(), items, byId, building: null };
  return cache;
}

async function getCatalogIndex({ force = false } = {}) {
  const fresh = Date.now() - cache.builtAt < CACHE_TTL_MS;
  if (!force && fresh && cache.items.length) return cache;
  if (cache.building) return cache.building;
  cache.building = buildIndex().catch((err) => {
    cache.building = null;
    throw err;
  });
  return cache.building;
}

function invalidateCatalogIndex() {
  cache = { builtAt: 0, items: [], byId: new Map(), building: null };
}

/** Summary used by status endpoint + logs: how many sellable items exist per domain/type. */
function summarizeIndex(index) {
  const byDomain = {};
  const byType = {};
  for (const it of index.items) {
    if (!it.sellable) continue;
    byDomain[it.domain] = (byDomain[it.domain] || 0) + 1;
    byType[it.productType] = (byType[it.productType] || 0) + 1;
  }
  return {
    total: index.items.length,
    sellable: index.items.filter((i) => i.sellable).length,
    byDomain,
    byType,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Shared matching helpers (used by the recommender and smoke tests)
 * ---------------------------------------------------------------------------------------------- */

function colorFamilyOf(name) {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return null;
  for (const { name: cn, family } of COLOR_LOOKUP) {
    if (n === cn) return family;
  }
  for (const { name: cn, family } of COLOR_LOOKUP) {
    if (n.includes(cn)) return family;
  }
  return null;
}

function passesGenderFilter(item, gender) {
  if (!gender || gender === 'unisex') return true;
  if (item.domain !== 'fashion') return true;
  if (item.gender === gender) return true;
  if (item.gender === 'unisex') return true;
  return false;
}

/** All canonical types mentioned in a free-text phrase (e.g. "dark straight-leg jeans" → ['jeans']). */
function typesInPhrase(phrase) {
  const out = [];
  const text = String(phrase || '');
  if (!text) return out;
  for (const rule of TYPE_RULES) {
    if (rule.re.test(text)) out.push({ type: rule.type, slot: rule.slot, domain: rule.domain });
  }
  return out;
}

const SLOT_OF_TYPE = Object.fromEntries(TYPE_RULES.map((r) => [r.type, r.slot]));

/** Backwards-compatible helper for scripts that pass a raw Prisma product. */
function inferProductGender(product) {
  const cls = classifyType(product);
  return inferGender(product, cls.domain);
}

module.exports = {
  getCatalogIndex,
  invalidateCatalogIndex,
  summarizeIndex,
  toCatalogItem,
  classifyType,
  inferGender,
  inferProductGender,
  passesGenderFilter,
  extractColors,
  colorFamilyOf,
  normalizeSize,
  typesInPhrase,
  SLOT_OF_TYPE,
  COLOR_FAMILIES,
  PRODUCT_INCLUDE,
};
