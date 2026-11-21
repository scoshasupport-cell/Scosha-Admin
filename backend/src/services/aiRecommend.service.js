/**
 * AI shopping assistant — recommendation orchestrator.
 *
 * Pipeline (every request):
 *   1. understand   Gemini universal image understanding (type, confidence, people, objects, colors)
 *   2. gate         unsupported / low quality / low confidence / mode-vs-image mismatch
 *   3. resolve      gender (confident photo > customer hint > ask), pipeline selection
 *   4. analyze      specialized Gemini analysis (face | body | furniture) → structured needs
 *   5. retrieve     in-memory catalog index filtered by domain / type / slot / gender / stock
 *   6. score        deterministic multi-factor score (type, color, material, style, size, keywords)
 *   7. rerank       Gemini judges the DB candidates (text only, cannot add products)
 *   8. validate     stock, gender, domain, 50% floor → up to 5 products when the catalog has them
 *   9. log          full decision trace via winston (never exposed to customers)
 *
 * Products only ever come from the catalog index (DB). Nothing is fabricated.
 */
const crypto = require('node:crypto');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');
const { env } = require('../config/env');
const gemini = require('./gemini.service');
const perfectCorp = require('./perfectCorp.service');
const catalog = require('./catalogIndex.service');

const MAX_RESULTS = 5;
const RERANK_POOL = 24;
const MIN_FINAL_SCORE = 50;
const MIN_PREFILTER_SCORE = 30;
const CONFIDENCE_PROCEED = 0.6;
const GENDER_CONFIDENCE_TRUST = 0.75;

const TYPE_CAPS = {
  'cushion-cover': 2,
  blanket: 1,
  curtain: 2,
  bedsheet: 2,
  'mattress-topper': 1,
  rug: 1,
  decor: 1,
};
const SLOT_CAPS = { upper: 2, lower: 2, full: 1, shoes: 1, bag: 1, head: 1, face: 1, hands: 1, neck: 1, beauty: 3, home: MAX_RESULTS };

const UNSUPPORTED_MESSAGES = {
  vehicle: 'This appears to be a vehicle. Please upload a face, body/fashion, or furniture image.',
  food: 'This appears to be food. Please upload a face, body/fashion, or furniture image.',
  animal: 'This appears to be an animal. Please upload a face, body/fashion, or furniture image.',
  landscape: 'This appears to be a landscape or outdoor scene. Please upload a face, body/fashion, or furniture image.',
  screenshot: 'This appears to be a screenshot or a screen. Please upload a real photo of a face, body/fashion, or furniture.',
  document: 'This appears to be a document or text. Please upload a face, body/fashion, or furniture image.',
  other: 'This image does not appear to show a face, an outfit, or furniture. Please upload a face, body/fashion, or furniture image.',
  blank: 'This image looks blank or empty. Please upload a clear photo of a face, body/fashion, or furniture.',
  blurry: 'This photo is too blurry or dark to analyze. Please upload a sharper, well-lit photo.',
};

const TYPE_LABEL = {
  face: 'a face',
  body: 'a person / outfit',
  clothing: 'a clothing product',
  furniture: 'furniture or a room',
};

const MODE_LABEL = { face: 'Face scan', body: 'Body / fashion scan', furniture: 'Furniture scan' };

/* ------------------------------------------------------------------------------------------------
 * Small utils
 * ---------------------------------------------------------------------------------------------- */

const uniq = (arr) => [...new Set((arr || []).filter(Boolean))];
const lower = (s) => String(s || '').toLowerCase().trim();
const norm = (s) => lower(s).replace(/[^a-z0-9]+/g, ' ').trim();

function familiesOf(colors = []) {
  return uniq(colors.map((c) => catalog.colorFamilyOf(c)));
}

function suggestLetterSize(measurements = {}) {
  const chest = Number(measurements.chest || measurements.bust || 0);
  const waist = Number(measurements.waist || 0);
  const unit = lower(measurements.unit || 'cm');
  let c = chest;
  let w = waist;
  if (unit === 'in' || unit === 'inch' || unit === 'inches') {
    c = chest ? chest * 2.54 : 0;
    w = waist ? waist * 2.54 : 0;
  }
  const ref = c || w;
  if (!ref) return null;
  if (ref < 86) return 'XS';
  if (ref < 94) return 'S';
  if (ref < 102) return 'M';
  if (ref < 110) return 'L';
  if (ref < 118) return 'XL';
  return 'XXL';
}

const LETTER_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function waistInches(measurements = {}) {
  const waist = Number(measurements.waist || 0);
  if (!waist) return null;
  const unit = lower(measurements.unit || 'cm');
  return unit.startsWith('in') ? waist : waist / 2.54;
}

function shoeSizeEu(measurements = {}, gender) {
  const raw = Number(measurements.shoeSize || 0);
  if (!raw) return null;
  if (raw >= 34) return raw; // already EU
  return gender === 'men' ? raw + 33 : raw + 31; // US → EU approximation
}

function num(v) {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(/,/g, '.').trim());
  return Number.isFinite(n) ? n : null;
}

/** Customer-entered details. Out-of-range values are dropped so they cannot steer matching. */
function readProfile(measurements = {}) {
  const imperial = lower(measurements.unit || 'cm').startsWith('in');
  const height = num(measurements.height);
  const weight = num(measurements.weight);
  let age = num(measurements.age);
  if (age != null) age = Math.round(age);
  if (age != null && (age < 1 || age > 120)) age = null;
  let heightCm = height && height > 0 ? (imperial ? height * 2.54 : height) : null;
  let weightKg = weight && weight > 0 ? (imperial ? weight * 0.45359237 : weight) : null;
  if (heightCm != null && (heightCm < 50 || heightCm > 230)) heightCm = null;
  if (weightKg != null && (weightKg < 8 || weightKg > 250)) weightKg = null;
  return { age, heightCm, weightKg };
}

const BUILD_LETTER = { slim: 'S', average: 'M', athletic: 'M', curvy: 'L', plus: 'XL' };

function letterFromHeightWeight(heightCm, weightKg) {
  if (!heightCm || !weightKg) return null;
  const bmi = weightKg / (heightCm / 100) ** 2;
  if (!Number.isFinite(bmi) || bmi < 12 || bmi > 55) return null;
  if (bmi < 18.5) return heightCm < 165 ? 'XS' : 'S';
  if (bmi < 23) return heightCm >= 185 ? 'L' : heightCm >= 175 ? 'M' : 'S';
  if (bmi < 27) return heightCm >= 185 ? 'XL' : 'M';
  if (bmi < 32) return 'L';
  if (bmi < 37) return 'XL';
  return 'XXL';
}

/**
 * Chest/waist stay a hard size filter (existing behavior).
 * Height and weight are only a hint, and only when they agree with the photo's build.
 * Adult letter charts are not applied to children.
 */
function resolveSizeHint({ measurements = {}, photoBuild, age }) {
  const measured = suggestLetterSize(measurements);
  if (measured) return { letter: measured, source: 'tape', note: null };
  if (age != null && age < 14) return { letter: null, source: null, note: null };
  const profile = readProfile(measurements);
  const hw = letterFromHeightWeight(profile.heightCm, profile.weightKg);
  const photo = BUILD_LETTER[photoBuild] || null;
  if (hw && photo) {
    const gap = Math.abs(LETTER_ORDER.indexOf(hw) - LETTER_ORDER.indexOf(photo));
    if (gap >= 2) {
      return {
        letter: null,
        source: 'photo',
        note: 'Your height and weight suggest a different size than the photo, so we followed the photo and did not filter by those numbers.',
      };
    }
  }
  if (hw) return { letter: hw, source: 'height-weight', note: null };
  return { letter: null, source: null, note: null };
}

function profileHint(profile, { formGender, resolved }) {
  const bits = [];
  if (profile.age != null) {
    const band =
      profile.age < 13 ? 'child' : profile.age < 18 ? 'teen' : profile.age < 30 ? 'young adult' : profile.age < 50 ? 'adult' : 'mature adult';
    bits.push(`age ${profile.age} (${band})`);
  }
  if (profile.heightCm) bits.push(`height ${Math.round(profile.heightCm)}cm`);
  if (profile.weightKg) bits.push(`weight ${Math.round(profile.weightKg)}kg`);
  if (formGender === 'men' || formGender === 'women') bits.push(`entered gender ${formGender}`);
  if (!bits.length) return '';
  const rule = resolved?.conflict
    ? ` The photo clearly reads as ${resolved.gender}, so ignore the entered gender and follow the photo.`
    : ' Treat these as hints for size and age-appropriateness. If the photo clearly disagrees, follow the photo.';
  return ` Customer details: ${bits.join(', ')}.${rule}`;
}

/**
 * Size availability check for one catalog item.
 * @returns {{ ok: boolean, size: string|null, note: string|null, reason: string|null, checked: boolean }}
 */
function checkSize(item, { letter, waistIn, shoeEu }) {
  const sizes = item.inStockSizes;
  if (!sizes.length) return { ok: false, size: null, note: null, reason: 'out_of_stock', checked: true };
  if (sizes.some((s) => s.kind === 'one-size' || s.kind === 'dimension' || s.kind === 'none')) {
    return { ok: true, size: sizes[0].size, note: null, reason: null, checked: false };
  }

  if (item.slot === 'shoes') {
    if (!shoeEu) return { ok: true, size: null, note: null, reason: null, checked: false };
    const scored = sizes
      .map((s) => {
        const eu = s.kind === 'eu-shoe' ? s.value : s.kind === 'us-shoe' ? s.value + 31 : null;
        return eu == null ? null : { s, diff: Math.abs(eu - shoeEu) };
      })
      .filter(Boolean)
      .sort((a, b) => a.diff - b.diff);
    if (!scored.length) return { ok: true, size: null, note: null, reason: null, checked: false };
    if (scored[0].diff <= 0.5) return { ok: true, size: scored[0].s.size, note: null, reason: null, checked: true };
    if (scored[0].diff <= 1) {
      return { ok: true, size: scored[0].s.size, note: `Closest size in stock: ${scored[0].s.size}`, reason: null, checked: true, adjacent: true };
    }
    return { ok: false, size: null, note: null, reason: 'size_unavailable', checked: true };
  }

  // Numeric sizes on non-footwear (e.g. "31", "34") are waist inches.
  const waistSizes = sizes.filter((s) => ['waist-in', 'eu-shoe', 'us-shoe', 'numeric'].includes(s.kind) && s.value >= 24 && s.value <= 44);
  if (waistSizes.length && waistIn) {
    const scored = waistSizes
      .map((s) => ({ s, diff: Math.abs(s.value - waistIn) }))
      .sort((a, b) => a.diff - b.diff);
    if (scored[0].diff <= 1) return { ok: true, size: scored[0].s.size, note: null, reason: null, checked: true };
    if (scored[0].diff <= 2) {
      return { ok: true, size: scored[0].s.size, note: `Closest waist in stock: ${scored[0].s.size}`, reason: null, checked: true, adjacent: true };
    }
    return { ok: false, size: null, note: null, reason: 'size_unavailable', checked: true };
  }

  if (letter && sizes.some((s) => s.kind === 'letter' || s.kind === 'letter-range')) {
    const want = LETTER_ORDER.indexOf(letter);
    const exact = sizes.find((s) => s.label === letter || (s.kind === 'letter-range' && s.label.split('-').includes(letter)));
    if (exact) return { ok: true, size: exact.size, note: null, reason: null, checked: true };
    const adjacent = sizes
      .filter((s) => s.kind === 'letter')
      .map((s) => ({ s, diff: Math.abs(LETTER_ORDER.indexOf(s.label) - want) }))
      .filter((x) => x.diff === 1)
      .sort((a, b) => a.diff - b.diff)[0];
    if (adjacent) {
      return { ok: true, size: adjacent.s.size, note: `Your estimate is ${letter}; ${adjacent.s.size} is the closest in stock`, reason: null, checked: true, adjacent: true };
    }
    return { ok: false, size: null, note: null, reason: 'size_unavailable', checked: true };
  }

  return { ok: true, size: null, note: null, reason: null, checked: false };
}

/* ------------------------------------------------------------------------------------------------
 * Needs → candidate retrieval → scoring
 * ---------------------------------------------------------------------------------------------- */

/**
 * A "need" is one thing we are looking for in the catalog.
 * { key, domain, slot, types[], colors[], avoidColors[], materials[], styleTags[], keywords[], reason, priority, weight }
 */
function buildNeedFromPhraseList({ key, domain, slot, phrases = [], colors = [], avoidColors = [], materials = [], styleTags = [], reason = '', priority = 5, weight = 1 }) {
  const types = uniq(phrases.flatMap((p) => catalog.typesInPhrase(p).map((t) => t.type)));
  const keywords = uniq(
    phrases
      .flatMap((p) => norm(p).split(' '))
      .filter((w) => w.length > 3 && !['with', 'that', 'this', 'from', 'your', 'dark', 'light'].includes(w)),
  );
  return {
    key,
    domain,
    slot: slot || (types.length ? catalog.SLOT_OF_TYPE[types[0]] : null),
    types,
    colors: uniq(colors.map(lower)),
    colorFamilies: familiesOf(colors),
    avoidFamilies: familiesOf(avoidColors),
    materials: uniq(materials.map(lower)),
    styleTags: uniq(styleTags.map(lower)),
    keywords,
    reason,
    priority,
    weight,
  };
}

function retrieveCandidates(index, need, { gender }) {
  const out = [];
  const rejected = [];
  for (const item of index.items) {
    if (!item.sellable) {
      rejected.push({ id: item.id, reason: item.isPlaceholder ? 'placeholder_name' : !item.hasImage ? 'no_image' : 'out_of_stock' });
      continue;
    }
    if (item.domain !== need.domain) continue; // different department – not even a rejection worth logging
    if (need.types.length) {
      const exact = need.types.includes(item.productType);
      // Home textiles are not substitutes for each other (a bed sheet is not a cushion cover);
      // fashion items in the same slot can be (a cardigan can stand in for a blazer).
      const sameSlot = need.domain !== 'home' && need.slot && item.slot === need.slot;
      if (!exact && !sameSlot) continue;
    } else if (need.slot && item.slot !== need.slot) {
      continue;
    }
    if (item.domain === 'fashion' && !catalog.passesGenderFilter(item, gender)) {
      rejected.push({ id: item.id, reason: `gender_mismatch(${item.gender})` });
      continue;
    }
    out.push(item);
  }
  return { candidates: out, rejected };
}

function scoreCandidate(item, need, ctx) {
  const parts = {};
  const evidence = [];

  // 1. product type / slot
  if (need.types.length && need.types.includes(item.productType)) {
    parts.type = 50;
    evidence.push(`type:${item.productType}`);
  } else if (need.slot && item.slot === need.slot) {
    // Same slot but a different type than requested needs strong harmony or a good AI verdict.
    parts.type = need.types.length ? 16 : 34;
    evidence.push(`slot:${item.slot}`);
  } else {
    parts.type = 0;
  }

  // 2. color harmony
  parts.color = 0;
  const exactColor = need.colors.find((c) => item.colors.includes(c));
  const familyHit = need.colorFamilies.find((f) => item.colorFamilies.includes(f));
  const avoidHit = need.avoidFamilies.find((f) => item.colorFamilies.includes(f));
  if (exactColor) {
    parts.color = 25;
    evidence.push(`color:${exactColor}`);
  } else if (familyHit) {
    parts.color = 20;
    evidence.push(`color:${familyHit}`);
  }
  if (avoidHit && !familyHit && !exactColor) {
    parts.color -= 20;
    evidence.push(`avoid:${avoidHit}`);
  }
  // multicolor/pattern items are a weak signal either way
  if (!exactColor && !familyHit && item.colorFamilies.length === 1 && item.colorFamilies[0] === 'multicolor') parts.color -= 4;

  // 3. material
  parts.material = 0;
  const matHit = need.materials.find((m) => item.materials.some((im) => im.includes(m) || m.includes(im)));
  if (matHit) {
    parts.material = 8;
    evidence.push(`material:${matHit}`);
  }

  // 4. style / season
  parts.style = 0;
  const styleHits = need.styleTags.filter((s) => item.styleTags.includes(s));
  if (styleHits.length) {
    parts.style = Math.min(12, styleHits.length * 6);
    evidence.push(`style:${styleHits.slice(0, 2).join('+')}`);
  }
  if (ctx.season === 'summer' && item.styleTags.includes('winter')) parts.style -= 10;
  if (ctx.season === 'winter' && item.styleTags.includes('summer')) parts.style -= 10;

  // 5. keyword overlap with what Gemini asked for
  parts.keywords = 0;
  const kwHits = need.keywords.filter((k) => item.text.includes(k));
  if (kwHits.length) {
    parts.keywords = Math.min(8, kwHits.length * 2);
  }

  // 6. size
  parts.size = 0;
  let sizeInfo = { ok: true, size: null, note: null, checked: false };
  if (item.domain === 'fashion' && ctx.sizeProfile) {
    sizeInfo = checkSize(item, ctx.sizeProfile);
    if (sizeInfo.ok && sizeInfo.checked) {
      parts.size = sizeInfo.adjacent ? 2 : 10;
      evidence.push(sizeInfo.adjacent ? 'size:closest' : `size:${sizeInfo.size}`);
    }
  }

  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw * need.weight)));
  return { score, parts, evidence, sizeInfo };
}

function customerReason({ item, need, evidence, rerank, ctx }) {
  if (rerank?.reason) return rerank.reason;
  const bits = [];
  const color = evidence.find((e) => e.startsWith('color:'));
  if (color) bits.push(`${color.slice(6)} works with your ${ctx.subjectLabel}`);
  const material = evidence.find((e) => e.startsWith('material:'));
  if (material) bits.push(`${material.slice(9)} suits the look`);
  const style = evidence.find((e) => e.startsWith('style:'));
  if (style) bits.push(`${style.slice(6).replace('+', ' & ')} style`);
  if (need.reason && bits.length < 2) bits.push(need.reason);
  if (!bits.length) bits.push(`Matches the ${need.slot || item.productType} you need`);
  return bits.slice(0, 2).join(' · ');
}

function toRecommendation(item, { score, slot, suggestedSize, sizeNote, reason, productType }) {
  const variants = item.sizes.map((s) => ({
    id: s.variantId,
    size: s.size,
    colorName: s.colorName || undefined,
    colorHex: s.colorHex || undefined,
    stock: s.stock,
    price: s.price,
    inStock: s.inStock,
  }));
  return {
    id: item.id,
    title: item.name,
    handle: item.slug,
    brand: item.brand,
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    image: item.image,
    images: item.images,
    category: item.categoryName,
    categorySlug: item.categorySlug,
    subCategory: item.subCategoryName,
    subCategorySlug: item.subCategorySlug,
    productType,
    sizes: uniq(item.inStockSizes.map((s) => s.size)),
    variants,
    inStock: item.inStock,
    slot,
    suggestedSize: suggestedSize || null,
    sizeNote: sizeNote || null,
    reason,
    matchScore: score,
    productGender: item.gender,
    tryOnSupported: item.domain === 'fashion' && ['upper', 'lower', 'full', 'shoes'].includes(item.slot) && Boolean(item.image),
  };
}

/**
 * Core matching: needs → DB candidates → deterministic score → Gemini rerank → validation.
 */
async function matchNeeds({ index, needs, gender, ctx, trace }) {
  const scored = new Map(); // id -> best { item, need, score, parts, evidence, sizeInfo }
  const rejections = [];

  for (const need of needs) {
    const { candidates, rejected } = retrieveCandidates(index, need, { gender });
    rejections.push(...rejected.map((r) => ({ ...r, need: need.key })));
    trace.retrieval.push({ need: need.key, slot: need.slot, types: need.types, colors: need.colors, candidates: candidates.length });
    for (const item of candidates) {
      const s = scoreCandidate(item, need, ctx);
      if (!s.sizeInfo.ok && s.sizeInfo.reason === 'out_of_stock') {
        rejections.push({ id: item.id, need: need.key, reason: 'out_of_stock' });
        continue;
      }
      if (!s.sizeInfo.ok) {
        // Keep a relevant product even when the exact size is missing, and say so.
        s.sizeInfo = {
          ...s.sizeInfo,
          ok: true,
          note: s.sizeInfo.note || 'Relevant to your photo — your exact size may differ',
        };
      }
      if (s.score < MIN_PREFILTER_SCORE) {
        rejections.push({ id: item.id, need: need.key, reason: `low_prefilter_score(${s.score})`, evidence: s.evidence });
        continue;
      }
      const prev = scored.get(item.id);
      if (!prev || prev.score < s.score) scored.set(item.id, { item, need, ...s });
    }
  }

  // Dedupe near-identical listings (same normalized name) keeping the best score
  const byName = new Map();
  for (const entry of scored.values()) {
    const key = entry.item.nameKey;
    const prev = byName.get(key);
    if (!prev || prev.score < entry.score) {
      if (prev) rejections.push({ id: prev.item.id, reason: 'duplicate_listing' });
      byName.set(key, entry);
    } else {
      rejections.push({ id: entry.item.id, reason: 'duplicate_listing' });
    }
  }

  let pool = [...byName.values()].sort((a, b) => b.score - a.score).slice(0, RERANK_POOL);
  trace.prefiltered = pool.map((p) => ({ id: p.item.id, name: p.item.name.slice(0, 60), need: p.need.key, score: p.score, parts: p.parts, evidence: p.evidence }));

  // Gemini rerank (text only). Failure is non-fatal: deterministic score stands alone.
  let rerankById = new Map();
  if (pool.length) {
    try {
      const { results, model } = await gemini.rerankCandidates({
        context: ctx.rerankContext,
        candidates: pool.map((p) => ({
          id: p.item.id,
          text: `${p.item.name.slice(0, 110)} | type=${p.item.productType} | colors=${p.item.colors.join('/') || 'unspecified'} | materials=${p.item.materials.join('/') || 'n/a'} | style=${p.item.styleTags.slice(0, 4).join('/') || 'n/a'} | for=${p.item.gender} | price=${p.item.price} | sizes=${p.item.inStockSizes.map((s) => s.size).join(',') || 'n/a'} | matched_for=${p.need.key}`,
        })),
      });
      rerankById = new Map(results.map((r) => [r.id, r]));
      trace.rerank = { model, results };
    } catch (err) {
      trace.rerank = { error: err.message };
      logger.warn('ai.rerank_failed', { requestId: trace.requestId, error: err.message });
    }
  }

  // Blend deterministic score with the AI judgement, then validate.
  const validated = [];
  for (const entry of pool) {
    const rr = rerankById.get(entry.item.id);
    let final = entry.score;
    if (rr) {
      const blend = Math.round(entry.score * 0.55 + rr.relevance * 0.45);
      const exactType = entry.evidence.some((e) => e.startsWith('type:'));
      // A clear catalog type match that already scores 50+ is kept. A weak substitute needs the blend.
      final = rr.relevance < MIN_FINAL_SCORE && !exactType ? blend : Math.max(entry.score, blend);
    }
    if (final < MIN_FINAL_SCORE) {
      rejections.push({ id: entry.item.id, reason: `below_threshold(${final})` });
      continue;
    }
    validated.push({ ...entry, final, rerank: rr || null });
  }
  validated.sort((a, b) => b.final - a.final || b.score - a.score);

  // Prefer a mix, then fill to 5 from anything still at or above the 50% floor.
  const finals = [];
  const pickedIds = new Set();
  const typeCount = {};
  const slotCount = {};
  for (const entry of validated) {
    if (finals.length >= MAX_RESULTS) break;
    const t = entry.item.productType;
    const s = entry.item.slot;
    const typeCap = TYPE_CAPS[t] ?? 3;
    const slotCap = SLOT_CAPS[s] ?? 3;
    if ((typeCount[t] || 0) >= typeCap || (slotCount[s] || 0) >= slotCap) continue;
    typeCount[t] = (typeCount[t] || 0) + 1;
    slotCount[s] = (slotCount[s] || 0) + 1;
    finals.push(entry);
    pickedIds.add(entry.item.id);
  }
  if (finals.length < MAX_RESULTS) {
    for (const entry of validated) {
      if (finals.length >= MAX_RESULTS) break;
      if (pickedIds.has(entry.item.id)) continue;
      finals.push(entry);
      pickedIds.add(entry.item.id);
    }
  }
  if (finals.length < MAX_RESULTS) {
    const rest = [...byName.values()].sort((a, b) => b.score - a.score);
    for (const entry of rest) {
      if (finals.length >= MAX_RESULTS) break;
      if (pickedIds.has(entry.item.id)) continue;
      if (entry.score < MIN_FINAL_SCORE) continue;
      if (!entry.evidence.some((e) => e.startsWith('type:'))) continue;
      finals.push({ ...entry, final: entry.score, rerank: null });
      pickedIds.add(entry.item.id);
    }
  }

  trace.rejections = summarizeRejections(rejections);
  trace.final = finals.map((f) => ({ id: f.item.id, name: f.item.name.slice(0, 60), final: f.final, det: f.score, rerank: f.rerank?.relevance ?? null, verdict: f.rerank?.verdict ?? null, evidence: f.evidence }));

  return finals.map((f) =>
    toRecommendation(f.item, {
      score: f.final,
      slot: f.item.slot === 'home' ? f.item.productType : f.item.slot,
      productType: f.item.productType,
      suggestedSize: f.sizeInfo.size,
      sizeNote: f.sizeInfo.note,
      reason: customerReason({ item: f.item, need: f.need, evidence: f.evidence, rerank: f.rerank, ctx }),
    }),
  );
}

function summarizeRejections(rejections) {
  const counts = {};
  for (const r of rejections) {
    const key = String(r.reason).replace(/\(.*\)$/, '');
    counts[key] = (counts[key] || 0) + 1;
  }
  return { counts, sample: rejections.slice(0, 40) };
}

/* ------------------------------------------------------------------------------------------------
 * Gate: unsupported / quality / confidence / mode mismatch
 * ---------------------------------------------------------------------------------------------- */

function compatibility(mode, vision) {
  const t = vision.imageType;
  const p = vision.people;
  if (mode === 'face') {
    if (t === 'face') return { ok: true };
    if (t === 'body' && p.faceVisible && p.faceCoverage === 'full') return { ok: true, note: 'body_visible' };
    if (t === 'body') {
      return {
        ok: false,
        message: 'We can see a person but not a clear, front-facing face. Please upload a closer face photo, or switch to Body scan for outfit matches.',
        suggestedMode: 'body',
      };
    }
    if (t === 'clothing') {
      return { ok: false, message: 'This image appears to contain a clothing product, not a face. Please upload a face image, or switch to Body scan to match this item.', suggestedMode: 'body' };
    }
    if (t === 'furniture') {
      return { ok: false, message: 'This image appears to contain furniture. Please upload a face image, or switch to Furniture scan.', suggestedMode: 'furniture' };
    }
  }
  if (mode === 'body') {
    if (t === 'body' || t === 'clothing') return { ok: true };
    if (t === 'face' && p.bodyCoverage && p.bodyCoverage !== 'none' && p.bodyCoverage !== 'hands_only') {
      return { ok: true, note: 'headshot_with_clothing' };
    }
    if (t === 'face') {
      return { ok: false, message: 'This looks like a close-up face photo. For outfit matches, upload a photo that shows your clothing, or switch to Face scan.', suggestedMode: 'face' };
    }
    if (t === 'furniture') {
      return { ok: false, message: 'This image appears to contain furniture, not a person or clothing. Please upload a body/fashion photo, or switch to Furniture scan.', suggestedMode: 'furniture' };
    }
  }
  if (mode === 'furniture') {
    if (t === 'furniture') return { ok: true };
    if (t === 'face') {
      return { ok: false, message: 'This image appears to contain a face, not furniture. Please upload a furniture or room photo, or switch to Face scan.', suggestedMode: 'face' };
    }
    if (t === 'body' || t === 'clothing') {
      return { ok: false, message: `This image appears to contain ${t === 'body' ? 'a person' : 'clothing'}, not furniture. Please upload a furniture or room photo, or switch to Body scan.`, suggestedMode: 'body' };
    }
  }
  return { ok: false, message: 'We could not match this photo to the selected scan type.', suggestedMode: null };
}

function gate({ mode, vision, confirmed }) {
  if (vision.isLowQuality) {
    const key = vision.imageType === 'blank' ? 'blank' : 'blurry';
    return { status: 'unsupported', message: UNSUPPORTED_MESSAGES[key], reason: `low_quality:${vision.imageType}` };
  }
  if (vision.isUnsupported) {
    return { status: 'unsupported', message: UNSUPPORTED_MESSAGES[vision.imageType] || UNSUPPORTED_MESSAGES.other, reason: `unsupported:${vision.imageType}` };
  }
  if (vision.people.count > 1 && (vision.imageType === 'face' || vision.imageType === 'body') && vision.people.bodyCoverage === 'hands_only') {
    return {
      status: 'unsupported',
      message: 'We can only see hands from several people. Please upload a photo of one person showing their face or outfit.',
      reason: 'multiple_people_hands_only',
    };
  }

  if (mode === 'auto') {
    const rec = vision.recommendedAnalysisType;
    if (rec === 'none') {
      return { status: 'unsupported', message: UNSUPPORTED_MESSAGES.other, reason: 'auto:no_pipeline' };
    }
    if (vision.confidence < CONFIDENCE_PROCEED && !confirmed) {
      return {
        status: 'unclear',
        message: `We think this shows ${TYPE_LABEL[vision.imageType] || 'something we are not sure about'}, but we are not certain. Choose what you want us to analyze, or upload a clearer photo.`,
        reason: `auto:low_confidence(${vision.confidence})`,
        options: uniq([rec, 'face', 'body', 'furniture']),
      };
    }
    return { status: 'ok', pipeline: rec };
  }

  const compat = compatibility(mode, vision);
  if (!compat.ok) {
    return {
      status: 'mismatch',
      message: compat.message,
      reason: `mismatch:${mode}<-${vision.imageType}`,
      suggestedMode: compat.suggestedMode,
    };
  }
  if (vision.confidence < CONFIDENCE_PROCEED && !confirmed) {
    return {
      status: 'unclear',
      message: `We are not fully sure this photo suits ${MODE_LABEL[mode]}. Continue anyway, or upload a clearer photo.`,
      reason: `low_confidence(${vision.confidence})`,
      options: [mode],
    };
  }
  return { status: 'ok', pipeline: mode, note: compat.note };
}

function resolveGender({ userGender, vision, analysis }) {
  const user = userGender === 'men' || userGender === 'women' ? userGender : null;
  const visionGender = vision.people.gender;
  const visionConf = vision.people.genderConfidence;
  const detailGender = analysis?.gender;
  const detailConf = analysis?.genderConfidence || 0;

  const photoGuess =
    detailGender && ['men', 'women'].includes(detailGender) && detailConf >= GENDER_CONFIDENCE_TRUST
      ? { gender: detailGender, conf: detailConf }
      : ['men', 'women'].includes(visionGender) && visionConf >= GENDER_CONFIDENCE_TRUST
        ? { gender: visionGender, conf: visionConf }
        : null;

  // A confident photo wins over the form. The form fills the gap only when the photo is unclear.
  if (photoGuess && user && photoGuess.gender !== user) {
    return { gender: photoGuess.gender, source: 'photo', conflict: true };
  }
  if (photoGuess) return { gender: photoGuess.gender, source: 'photo', conflict: false };
  if (user) return { gender: user, source: 'customer', conflict: false };

  const garment = (vision.visibleProducts || []).find((p) => p.targetGender === 'men' || p.targetGender === 'women');
  if (garment) return { gender: garment.targetGender, source: 'garment', conflict: false };

  return { gender: null, source: null, conflict: false };
}

/* ------------------------------------------------------------------------------------------------
 * Pipelines
 * ---------------------------------------------------------------------------------------------- */

async function uploadToPerfectCorp(buffer, meta = {}) {
  if (!perfectCorp.apiKeyConfigured()) return { fileId: null, error: 'not_configured' };
  try {
    const uploaded = await perfectCorp.uploadImageBuffer(buffer, {
      fileName: meta.fileName || 'scan.jpg',
      contentType: meta.contentType || 'image/jpeg',
    });
    return { fileId: uploaded.fileId, error: null };
  } catch (err) {
    return { fileId: null, error: err.message };
  }
}

function summarizeSkinScores(raw) {
  const scoreInfo = raw?.score_info || raw?.results?.score_info || raw?.result?.score_info || {};
  const scores = {};
  const concerns = [];
  for (const [key, value] of Object.entries(scoreInfo)) {
    const v = typeof value === 'number' ? value : value && typeof value === 'object' && typeof value.score === 'number' ? value.score : null;
    if (v == null) continue;
    scores[key] = v;
    if (v >= 40) concerns.push(key.replace(/^hd_/, '').replace(/_/g, ' '));
  }
  return { scores, concerns: concerns.slice(0, 6) };
}

function buildFaceReport(face, skin) {
  const observations = uniq([...(skin?.concerns || []), ...(face.skinAppearance?.observations || [])]).slice(0, 6);
  const tips = [];
  const obsText = observations.join(' ').toLowerCase();
  if (/dry|dull|flak/.test(obsText)) tips.push({ step: 'Hydrate', tip: 'A hydrating moisturizer helps areas that look dry or dull.' });
  if (/shine|oil|pore|acne|blemish/.test(obsText)) tips.push({ step: 'Balance', tip: 'A gentle, oil-balancing cleanser suits a shiny T-zone.' });
  if (/wrinkle|texture|line/.test(obsText)) tips.push({ step: 'Smooth', tip: 'Texture-smoothing care can soften visible lines.' });
  if (/red|sensitiv/.test(obsText)) tips.push({ step: 'Soothe', tip: 'Fragrance-free, calming formulas are kinder to reactive skin.' });
  tips.push({ step: 'Protect', tip: 'Daily SPF keeps tone even. (Cosmetic guidance only — not medical advice.)' });

  const summaryBits = [];
  if (face.faceShape && face.faceShape !== 'unknown') summaryBits.push(`${face.faceShape} face shape`);
  if (face.skinTone && face.skinTone !== 'unknown') summaryBits.push(`${face.skinTone} skin tone`);
  if (face.undertone && face.undertone !== 'unknown') summaryBits.push(`${face.undertone} undertone`);
  return {
    faceShape: face.faceShape,
    skinTone: face.skinTone,
    undertone: face.undertone,
    skinType: face.skinAppearance?.type || 'unknown',
    concerns: observations,
    careTips: tips.slice(0, 4),
    perfectCorpScores: skin?.scores || {},
    sunglassesStyles: face.accessoryFit?.sunglassesStyles || [],
    hatStyles: face.accessoryFit?.hatStyles || [],
    flatteringColors: face.accessoryFit?.flatteringColors || [],
    summary: summaryBits.length ? `Detected ${summaryBits.join(' · ')}.` : face.notes || 'Face analyzed.',
    notes: face.notes,
  };
}

async function runFacePipeline({ buffer, mimeType, meta, vision, index, genderInput, measurements, trace }) {
  const [face, upload] = await Promise.all([
    gemini.analyzeFace(buffer, { mimeType }),
    uploadToPerfectCorp(buffer, meta),
  ]);
  trace.analysis = { face };

  // Stage 1 already confirmed a face for this image; only reject when both stages agree there is none.
  const stage1SawFace = Boolean(vision?.people?.faceVisible) && vision.people.faceCoverage !== 'none';
  if (!face.faceVisible && !stage1SawFace) {
    return {
      status: 'mismatch',
      message: 'We could not find a clear face in this photo. Please upload a front-facing photo with good lighting.',
      reason: 'face_analysis:no_face',
    };
  }
  if (face.faceCount > 1) {
    return {
      status: 'unclear',
      message: `We found ${face.faceCount} faces. Please upload a photo with a single person so recommendations are personal.`,
      reason: 'face_analysis:multiple_faces',
      options: [],
    };
  }

  let skin = null;
  if (upload.fileId) {
    try {
      skin = summarizeSkinScores(await perfectCorp.runSkinAnalysis(upload.fileId));
    } catch (err) {
      trace.perfectCorp = { error: err.message };
    }
  }
  const report = buildFaceReport(face, skin);

  const g = resolveGender({ userGender: genderInput, vision, analysis: face });
  // Face-adjacent items are mostly unisex; we only ask for gender if a gendered item would be shown.
  const gender = g.gender || null;
  const profile = readProfile(measurements);
  const hint = profileHint(profile, { formGender: genderInput, resolved: g });

  const palette = uniq(face.accessoryFit?.flatteringColors || []);
  const needs = [];
  if (!face.eyewearPresent) {
    needs.push(
      buildNeedFromPhraseList({
        key: 'sunglasses',
        domain: 'fashion',
        slot: 'face',
        phrases: ['sunglasses', ...(face.accessoryFit?.sunglassesStyles || []).map((s) => `${s} sunglasses`)],
        colors: palette,
        avoidColors: face.accessoryFit?.avoidColors || [],
        reason: `${(face.accessoryFit?.sunglassesStyles || [])[0] || 'classic'} frames suit a ${face.faceShape} face`,
        priority: 1,
      }),
    );
  }
  if (!face.headwearPresent) {
    needs.push(
      buildNeedFromPhraseList({
        key: 'hat',
        domain: 'fashion',
        slot: 'head',
        phrases: ['hat', ...(face.accessoryFit?.hatStyles || []).map((s) => `${s} hat`)],
        colors: palette,
        avoidColors: face.accessoryFit?.avoidColors || [],
        reason: `${(face.accessoryFit?.hatStyles || [])[0] || 'a classic'} hat flatters your face shape`,
        priority: 2,
      }),
    );
  }
  const skinType = face.skinAppearance?.type || 'unknown';
  needs.push(
    buildNeedFromPhraseList({
      key: 'skincare',
      domain: 'beauty',
      slot: 'beauty',
      phrases: ['cleanser', 'moisturizer', 'serum', 'sunscreen'],
      reason: skinType !== 'unknown' ? `suited to ${skinType} skin` : 'daily skincare',
      priority: 3,
    }),
  );
  needs.push(
    buildNeedFromPhraseList({
      key: 'scarf',
      domain: 'fashion',
      slot: 'neck',
      phrases: ['scarf'],
      colors: palette,
      reason: 'a scarf in a flattering color near the face',
      priority: 4,
      weight: 0.9,
    }),
  );

  const ctx = {
    season: 'unknown',
    sizeProfile: null,
    subjectLabel: 'skin tone',
    rerankContext: `Face photo. ${report.summary} Skin appearance: ${skinType}. Flattering colors: ${palette.join(', ') || 'n/a'}. Avoid: ${(face.accessoryFit?.avoidColors || []).join(', ') || 'n/a'}. Customer: ${gender || 'gender not specified'}. We want face-adjacent items: sunglasses, hats, scarves, skincare.${hint}`,
  };
  trace.needs = needs;
  const recommendations = await matchNeeds({ index, needs, gender, ctx, trace });

  if (!gender && recommendations.some((r) => r.productGender === 'men' || r.productGender === 'women')) {
    return {
      status: 'needs_input',
      needsInput: { field: 'gender', options: ['women', 'men'], message: 'Who are we shopping for? Some matching accessories are gender-specific.' },
      message: 'Who are we shopping for?',
      reason: 'gender_unresolved',
      skinReport: report,
      analysis: { skinReport: report },
    };
  }

  const summary = catalog.summarizeIndex(index);
  const stockNote = !summary.byDomain.beauty && !summary.byType.sunglasses && !summary.byType.hat
    ? 'Scosha does not currently stock skincare, sunglasses, or hats, so we are not showing unrelated products.'
    : null;

  const suggestions = [];
  if (face.upperBodyClothingVisible || (vision.people.bodyCoverage && vision.people.bodyCoverage !== 'none')) {
    suggestions.push({ action: 'switch_mode', mode: 'body', label: 'Match my outfit instead' });
  }

  return {
    status: recommendations.length ? 'ok' : 'no_matches',
    message: recommendations.length
      ? `${report.summary} ${recommendations.length} matching item${recommendations.length === 1 ? '' : 's'} found.`
      : `${report.summary} ${stockNote || 'No face-related products in the catalog match this photo right now.'}`,
    gender: g.gender,
    genderSource: g.source,
    genderConflict: g.conflict,
    skinReport: report,
    analysis: { skinReport: report },
    recommendations,
    suggestions,
    catalogNote: stockNote,
    fileId: upload.fileId,
    tryOnAvailable: false,
  };
}

function bodyAreaToSlot(bodyArea) {
  const a = lower(bodyArea);
  if (a === 'upper' || a === 'arms' || a === 'top') return 'upper';
  if (a === 'legs' || a === 'lower' || a === 'bottom') return 'lower';
  if (a === 'shoes' || a === 'feet') return 'shoes';
  if (a === 'bags' || a === 'bag') return 'bag';
  return null;
}

async function runBodyPipeline({ buffer, mimeType, vision, index, genderInput, bodyArea, measurements, trace, gateNote }) {
  const body = await gemini.analyzeBody(buffer, { mimeType, bodyArea: bodyArea || 'full' });
  trace.analysis = { body };

  const isProductShot = vision.imageType === 'clothing' || (!body.personPresent && body.garments.length);
  if (!isProductShot && body.personCount > 1) {
    return {
      status: 'unclear',
      message: `We found ${body.personCount} people. Please upload a photo of one person so the outfit match is personal.`,
      reason: 'body_analysis:multiple_people',
      options: [],
    };
  }
  if (!isProductShot && !body.personPresent) {
    return {
      status: 'mismatch',
      message: 'We could not find a person or clothing in this photo. Please upload a body/fashion photo.',
      reason: 'body_analysis:no_person',
    };
  }

  const profile = readProfile(measurements);
  const g = resolveGender({ userGender: genderInput, vision, analysis: body });
  if (!g.gender) {
    return {
      status: 'needs_input',
      needsInput: { field: 'gender', options: ['women', 'men'], message: 'Who are we shopping for? We only show matches from the Men or Women catalog — never mixed.' },
      message: 'Who are we shopping for?',
      reason: 'gender_unresolved',
      analysis: { bodyReport: publicBodyReport(body) },
    };
  }
  const gender = g.gender;

  const focusSlot = bodyAreaToSlot(bodyArea);
  const sizeDecision = resolveSizeHint({ measurements, photoBuild: body.build, age: profile.age });
  const letter = sizeDecision.letter;
  const sizeProfile = measurements && (letter || measurements.shoeSize || measurements.waist)
    ? { letter, waistIn: waistInches(measurements), shoeEu: shoeSizeEu(measurements, gender) }
    : null;
  const hint = profileHint(profile, { formGender: genderInput, resolved: g });

  const needs = [];
  let complements = body.complements || [];
  if (focusSlot) complements = complements.filter((c) => c.slot === focusSlot);
  complements.forEach((c, i) => {
    needs.push(
      buildNeedFromPhraseList({
        key: `complement:${c.slot}`,
        domain: 'fashion',
        slot: c.slot,
        phrases: c.types,
        colors: c.colors,
        avoidColors: c.avoidColors,
        styleTags: body.styleTags,
        reason: c.reason,
        priority: i + 1,
      }),
    );
  });
  if (!needs.length && !isProductShot) {
    // Gemini gave no usable complements: fall back to the slots the outfit is missing.
    const covered = new Set(body.garments.map((x) => x.slot));
    const fallbackSlots = focusSlot ? [focusSlot] : ['upper', 'lower', 'shoes'].filter((s) => !covered.has(s) && !covered.has('full'));
    for (const slot of fallbackSlots) {
      needs.push(
        buildNeedFromPhraseList({
          key: `focus:${slot}`,
          domain: 'fashion',
          slot,
          phrases: [],
          colors: uniq([...(body.dominantColors || []), 'black', 'white', 'navy', 'beige']),
          styleTags: body.styleTags,
          reason: `to complete your look (${slot})`,
          priority: 1,
        }),
      );
    }
  }
  if (isProductShot) {
    for (const garment of body.garments.slice(0, 2)) {
      if (focusSlot && garment.slot !== focusSlot) continue;
      needs.push(
        buildNeedFromPhraseList({
          key: `similar:${garment.slot}`,
          domain: 'fashion',
          slot: garment.slot,
          phrases: [garment.type],
          colors: garment.colors,
          materials: garment.material ? [garment.material] : [],
          styleTags: body.styleTags,
          reason: `similar to the ${garment.type} in your photo`,
          priority: 0,
        }),
      );
    }
  }

  const garmentSummary = body.garments.map((x) => `${x.colors.join('/')} ${x.type} (${x.slot})`).join(', ') || 'none detected';
  const ctx = {
    season: body.season,
    sizeProfile,
    subjectLabel: isProductShot ? 'item' : 'outfit',
    rerankContext: `${isProductShot ? 'Clothing product photo' : 'Outfit photo'}. Visible: ${garmentSummary}. Style: ${body.styleTags.join(', ') || 'n/a'}. Season: ${body.season}. Dominant colors: ${body.dominantColors.join(', ')}. Photo build: ${body.build || 'unknown'}. Customer: ${gender}${letter ? `, estimated size ${letter}` : ''}. Focus: ${focusSlot || 'whole look'}. Needs: ${complements.map((c) => `${c.slot} → ${c.types.join('/')} in ${c.colors.join('/')} (${c.reason})`).join('; ') || 'complete the look'}.${hint}${sizeDecision.note ? ` ${sizeDecision.note}` : ''}`,
  };
  trace.needs = needs;
  trace.sizeProfile = sizeProfile;
  const recommendations = await matchNeeds({ index, needs, gender, ctx, trace });

  const report = publicBodyReport(body);
  const emptyReason = !recommendations.length
    ? sizeProfile
      ? `No ${gender} items in the catalog match this look in your size right now.`
      : `No ${gender} items in the catalog match this look right now.`
    : null;

  return {
    status: recommendations.length ? 'ok' : 'no_matches',
    message: recommendations.length
      ? `${body.notes || 'Outfit analyzed.'} ${recommendations.length} match${recommendations.length === 1 ? '' : 'es'} from the ${gender} catalog.`
      : `${body.notes || 'Outfit analyzed.'} ${emptyReason}`,
    gender,
    genderSource: g.source,
    genderConflict: g.conflict,
    bodyReport: report,
    analysis: { bodyReport: report },
    measurements: {
      suggestedLetterSize: letter,
      sizeChecked: Boolean(sizeProfile),
      sizeSource: sizeDecision.source,
      profileNote: sizeDecision.note,
    },
    recommendations,
    suggestions: gateNote === 'headshot_with_clothing' ? [{ action: 'switch_mode', mode: 'face', label: 'Analyze my face instead' }] : [],
    tryOnAvailable: perfectCorp.apiKeyConfigured() && !isProductShot,
  };
}

function publicBodyReport(body) {
  return {
    garments: body.garments,
    styleTags: body.styleTags,
    season: body.season,
    occasion: body.occasion,
    dominantColors: body.dominantColors,
    build: body.build,
    notes: body.notes,
    lookingFor: (body.complements || []).map((c) => `${c.types.slice(0, 2).join(' or ')} (${c.slot})`),
  };
}

const DEFAULT_FURNITURE_COMPLEMENTS = {
  sofa: ['cushion-cover', 'blanket'],
  armchair: ['cushion-cover', 'blanket'],
  chair: ['cushion-cover'],
  bed: ['bedsheet', 'blanket', 'cushion-cover', 'mattress-topper'],
  curtain: ['curtain', 'cushion-cover'],
  cushion: ['cushion-cover', 'blanket'],
  rug: ['cushion-cover', 'blanket'],
  room: ['cushion-cover', 'blanket', 'curtain'],
};

async function runFurniturePipeline({ buffer, mimeType, index, trace }) {
  const scene = await gemini.analyzeFurniture(buffer, { mimeType });
  trace.analysis = { furniture: scene };

  if (!scene.isHomeScene && !scene.items.length) {
    return {
      status: 'mismatch',
      message: 'We could not find furniture or a room in this photo. Please upload a photo of a sofa, bed, chair, window, or room.',
      reason: 'furniture_analysis:not_home_scene',
    };
  }

  let complements = scene.complements || [];
  if (!complements.length) {
    const defaults = DEFAULT_FURNITURE_COMPLEMENTS[scene.primaryType] || [];
    complements = defaults.map((productType, i) => ({
      productType,
      colors: scene.palette,
      avoidColors: [],
      materials: [],
      priority: i + 1,
      reason: `pairs with your ${scene.primaryType}`,
    }));
  }

  const needs = complements.map((c, i) =>
    buildNeedFromPhraseList({
      key: `home:${c.productType}`,
      domain: 'home',
      slot: 'home',
      phrases: [c.productType.replace('-', ' ')],
      colors: c.colors,
      avoidColors: c.avoidColors,
      materials: c.materials,
      styleTags: [scene.style].filter((s) => s && s !== 'unknown'),
      reason: c.reason,
      priority: c.priority || i + 1,
      weight: i === 0 ? 1 : i === 1 ? 0.97 : 0.94,
    }),
  ).map((n) => ({ ...n, types: n.types.length ? n.types : [complementTypeFallback(n.key)] }));

  const itemSummary = scene.items.map((x) => `${x.colors.join('/')} ${x.material || ''} ${x.type}`.trim()).join(', ') || scene.primaryType;
  const ctx = {
    season: 'unknown',
    sizeProfile: null,
    subjectLabel: scene.primaryType === 'room' ? 'room' : scene.primaryType,
    rerankContext: `Home photo (${scene.roomType.replace('_', ' ')}). Main item: ${scene.primaryType}. Visible: ${itemSummary}. Style: ${scene.style}. Palette: ${scene.palette.join(', ')}. Existing textiles: ${scene.existingTextiles.join(', ') || 'none'}. Needs: ${complements.map((c) => `${c.productType} in ${c.colors.join('/')}${c.materials?.length ? ` (${c.materials.join('/')})` : ''} — ${c.reason}`).join('; ')}.`,
  };
  trace.needs = needs;
  const recommendations = await matchNeeds({ index, needs, gender: null, ctx, trace });

  const report = {
    furnitureType: scene.primaryType,
    roomType: scene.roomType,
    style: scene.style,
    colors: scene.palette,
    items: scene.items,
    existingTextiles: scene.existingTextiles,
    complements: complements.map((c) => c.productType.replace('-', ' ')),
    notes: scene.notes,
  };
  const wantedTypes = uniq(complements.map((c) => c.productType));
  const summary = catalog.summarizeIndex(index);
  const unavailableTypes = wantedTypes.filter((t) => !summary.byType[t]);

  return {
    status: recommendations.length ? 'ok' : 'no_matches',
    message: recommendations.length
      ? `${scene.notes || 'Space analyzed.'} ${recommendations.length} piece${recommendations.length === 1 ? '' : 's'} that suit this ${scene.primaryType === 'room' ? 'room' : scene.primaryType}.`
      : `${scene.notes || 'Space analyzed.'} ${
          unavailableTypes.length === wantedTypes.length && wantedTypes.length
            ? `We do not currently stock ${wantedTypes.map((t) => t.replace('-', ' ')).join(' or ')}, so there is nothing relevant to show.`
            : 'Nothing in our home collection harmonizes with this space right now, so we are not showing unrelated items.'
        }`,
    furnitureReport: report,
    scene: report,
    analysis: { furnitureReport: report },
    recommendations,
    suggestions: [],
    tryOnAvailable: false,
  };
}

function complementTypeFallback(key) {
  return key.replace(/^home:/, '');
}

/* ------------------------------------------------------------------------------------------------
 * Entry point
 * ---------------------------------------------------------------------------------------------- */

/**
 * @param {Buffer} buffer
 * @param {object} opts
 * @param {'face'|'body'|'furniture'|'auto'} opts.mode
 * @param {string|null} opts.gender         customer-selected gender
 * @param {string} opts.bodyArea
 * @param {object} opts.measurements
 * @param {boolean} opts.confirmed          customer confirmed a low-confidence classification
 * @param {string} opts.contentType
 * @param {string} opts.fileName
 * @param {boolean} opts.includeDebug
 */
async function recommend(buffer, opts = {}) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const mode = ['face', 'body', 'furniture', 'auto'].includes(opts.mode) ? opts.mode : 'auto';
  const mimeType = opts.contentType || 'image/jpeg';
  const trace = {
    requestId,
    mode,
    input: {
      gender: opts.gender || null,
      bodyArea: opts.bodyArea || null,
      hasMeasurements: Boolean(opts.measurements && Object.values(opts.measurements).some((v) => v)),
      age: readProfile(opts.measurements || {}).age,
      confirmed: Boolean(opts.confirmed),
      bytes: buffer.length,
      mimeType,
    },
    retrieval: [],
    prefiltered: [],
    rejections: null,
    final: [],
    timings: {},
  };

  const base = { requestId, mode };
  const finish = (result) => {
    trace.timings.total = Date.now() - startedAt;
    trace.outcome = { status: result.status, reason: result.reason || null, count: result.recommendations?.length || 0 };
    logger.info('ai.recommend', trace);
    const payload = {
      ...base,
      ...result,
      recommendations: result.recommendations || [],
      recommendationCount: result.recommendations?.length || 0,
      // compat for existing UI
      needsClarification:
        result.status === 'needs_input' && result.needsInput?.field === 'gender'
          ? ['gender']
          : result.status === 'unclear' && result.options?.length
            ? result.options
            : undefined,
    };
    if (opts.includeDebug) payload.debug = trace;
    return payload;
  };

  if (!gemini.apiKeyConfigured()) {
    return finish({
      status: 'error',
      message: 'Image analysis is temporarily unavailable. Please try again later.',
      reason: 'gemini_not_configured',
    });
  }

  // 1. universal understanding
  let vision;
  const t0 = Date.now();
  try {
    vision = await gemini.understandImage(buffer, { mimeType });
  } catch (err) {
    trace.error = err.message;
    logger.error('ai.vision_failed', { requestId, error: err.message, statusCode: err.statusCode });
    return finish({
      status: 'error',
      message:
        err.statusCode === 429
          ? 'Our image analysis is busy right now. Please try again in a minute.'
          : 'We could not analyze this photo right now. Please try again.',
      reason: `vision_error:${err.statusCode || 'unknown'}`,
    });
  }
  trace.timings.understand = Date.now() - t0;
  trace.vision = vision;

  const common = {
    imageType: vision.imageType,
    confidence: vision.confidence,
    detected: {
      description: vision.description,
      objects: vision.detectedObjects,
      people: vision.people,
      colors: vision.dominantColors,
    },
  };

  // 2. gate
  const decision = gate({ mode, vision, confirmed: Boolean(opts.confirmed) });
  trace.gate = decision;
  if (decision.status !== 'ok') {
    const suggestions = [];
    if (decision.suggestedMode) {
      suggestions.push({ action: 'switch_mode', mode: decision.suggestedMode, label: `Switch to ${MODE_LABEL[decision.suggestedMode]}` });
    }
    suggestions.push({ action: 'retake', label: 'Upload a different photo' });
    return finish({
      ...common,
      status: decision.status,
      pipeline: null,
      message: decision.message,
      reason: decision.reason,
      suggestedMode: decision.suggestedMode || null,
      options: decision.options,
      needsInput: decision.status === 'unclear' && decision.options?.length ? { field: 'imageType', options: decision.options, message: decision.message } : undefined,
      suggestions,
    });
  }

  // 3-8. specialized pipeline
  const index = await catalog.getCatalogIndex();
  trace.catalog = catalog.summarizeIndex(index);
  const pipeline = decision.pipeline;
  const t1 = Date.now();
  let result;
  try {
    if (pipeline === 'face') {
      result = await runFacePipeline({
        buffer,
        mimeType,
        meta: opts,
        vision,
        index,
        genderInput: opts.gender,
        measurements: opts.measurements || {},
        trace,
      });
    } else if (pipeline === 'body') {
      result = await runBodyPipeline({
        buffer,
        mimeType,
        vision,
        index,
        genderInput: opts.gender,
        bodyArea: opts.bodyArea,
        measurements: opts.measurements || {},
        trace,
        gateNote: decision.note,
      });
    } else {
      result = await runFurniturePipeline({ buffer, mimeType, index, trace });
    }
  } catch (err) {
    trace.error = err.message;
    logger.error('ai.pipeline_failed', { requestId, pipeline, error: err.message, stack: err.stack });
    return finish({
      ...common,
      status: 'error',
      pipeline,
      message:
        err.statusCode === 429
          ? 'Our image analysis is busy right now. Please try again in a minute.'
          : 'We could not finish analyzing this photo. Please try again.',
      reason: `pipeline_error:${err.statusCode || 'unknown'}`,
    });
  }
  trace.timings.pipeline = Date.now() - t1;

  return finish({ ...common, pipeline, ...result });
}

/* ------------------------------------------------------------------------------------------------
 * Virtual try-on (Perfect Corp Cloth V4) — unchanged behaviour, now uses the catalog index
 * ---------------------------------------------------------------------------------------------- */

async function virtualTryOn({ personBuffer, productId, fileName, contentType, personFileId }) {
  if (!perfectCorp.apiKeyConfigured()) {
    throw new ApiError(503, 'Perfect Corp is not configured. Set PERFECT_CORP_API_KEY for virtual try-on.');
  }
  const id = parseInt(String(productId), 10);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid product id');

  const product = await prisma.product.findFirst({ where: { id, status: 'active' }, include: catalog.PRODUCT_INCLUDE });
  if (!product) throw ApiError.notFound('Product not found');
  const item = catalog.toCatalogItem(product);
  if (!item.image) throw ApiError.badRequest('This product has no image for try-on');
  if (item.domain !== 'fashion') throw ApiError.badRequest('Try-on is only available for clothing and shoes');

  let srcFileId = personFileId || null;
  if (!srcFileId && personBuffer) {
    const uploaded = await perfectCorp.uploadImageBuffer(personBuffer, {
      fileName: fileName || 'person.jpg',
      contentType: contentType || 'image/jpeg',
    });
    srcFileId = uploaded.fileId;
  }
  if (!srcFileId) throw ApiError.badRequest('Person photo is required for try-on');

  const garmentCategory = item.slot === 'shoes' ? 'shoes' : item.slot === 'lower' ? 'lower' : item.slot === 'upper' ? 'upper' : 'auto';
  try {
    const result = await perfectCorp.runClothTryOn({ personFileId: srcFileId, garmentUrl: item.image, garmentCategory });
    const resultUrl =
      result?.dst_file_url || result?.result_url || result?.results?.[0]?.url || result?.data?.dst_file_url || result?.data?.result_url || null;
    return {
      ok: true,
      productId: item.id,
      productTitle: item.name,
      personFileId: srcFileId,
      garmentCategory,
      resultUrl,
      message: resultUrl ? 'Virtual try-on ready' : 'Try-on finished without an image URL.',
    };
  } catch (err) {
    throw new ApiError(502, err.message || 'Virtual try-on failed');
  }
}

/**
 * Deterministic catalog match without an image (used by smoke tests / future text search).
 */
async function matchCatalogProducts({ gender = 'women', bodyArea = 'full', colors = [], limit = 8 }) {
  const index = await catalog.getCatalogIndex();
  const slot = bodyAreaToSlot(bodyArea) || 'upper';
  const need = buildNeedFromPhraseList({ key: `manual:${slot}`, domain: 'fashion', slot, phrases: [], colors });
  const { candidates } = retrieveCandidates(index, need, { gender });
  return candidates
    .map((item) => ({ item, ...scoreCandidate(item, need, { season: 'unknown', sizeProfile: null }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => toRecommendation(c.item, { score: c.score, slot, productType: c.item.productType, reason: c.evidence.join(' · ') }));
}

module.exports = {
  recommend,
  virtualTryOn,
  matchCatalogProducts,
  suggestLetterSize,
  // exported for unit-style tests
  _internal: {
    gate,
    compatibility,
    resolveGender,
    readProfile,
    resolveSizeHint,
    checkSize,
    scoreCandidate,
    buildNeedFromPhraseList,
    retrieveCandidates,
    matchNeeds,
  },
};
