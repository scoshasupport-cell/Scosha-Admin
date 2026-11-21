/**
 * Gemini vision/text client for the AI shopping assistant.
 *
 * Design:
 *  - Every call is strict JSON (responseMimeType + responseSchema) so downstream code never parses prose.
 *  - A model fallback chain + retry handles 429/5xx/404 (the primary alias is frequently overloaded).
 *  - Stage 1 `understandImage` is a universal classifier that runs BEFORE any recommendation logic.
 *  - Stage 2 analyzers (`analyzeFace`, `analyzeBody`, `analyzeFurniture`) only run after the gate passes.
 *  - `rerankCandidates` is text-only: it scores catalog candidates that the DB already produced.
 *    It can never introduce a product that is not in the candidate list.
 */
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const IMAGE_TYPES = [
  'face',
  'body',
  'clothing',
  'furniture',
  'vehicle',
  'food',
  'animal',
  'landscape',
  'screenshot',
  'document',
  'blank',
  'blurry',
  'other',
];

const UNSUPPORTED_TYPES = new Set([
  'vehicle',
  'food',
  'animal',
  'landscape',
  'screenshot',
  'document',
  'other',
]);
const LOW_QUALITY_TYPES = new Set(['blank', 'blurry']);

function apiKeyConfigured() {
  return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim());
}

function modelName() {
  return (env.GEMINI_MODEL || 'gemini-flash-latest').trim();
}

function modelChain() {
  const chain = [modelName(), ...String(env.GEMINI_FALLBACK_MODELS || '').split(',')]
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set(chain)];
}

function parseJsonText(text) {
  const cleaned = String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isRetryableStatus(status) {
  return status === 429 || status === 404 || status === 408 || status >= 500;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per-model circuit breaker: after a 429/503/404 the model is skipped for a cool-down so the
 * 2-3 calls that make up one analysis go straight to a healthy model.
 */
const modelCooldownUntil = new Map();
const COOLDOWN_MS = { 404: 6 * 60 * 60 * 1000, 429: 45 * 1000, default: 90 * 1000 };

function markUnhealthy(model, status) {
  const ms = COOLDOWN_MS[status] || COOLDOWN_MS.default;
  modelCooldownUntil.set(model, Date.now() + ms);
}

function orderedModels() {
  const chain = modelChain();
  const now = Date.now();
  const healthy = chain.filter((m) => (modelCooldownUntil.get(m) || 0) <= now);
  const cooling = chain.filter((m) => (modelCooldownUntil.get(m) || 0) > now);
  return [...healthy, ...cooling];
}

/**
 * Low-level call with model fallback. Resolves { text, json, model, attempts }.
 * Note: Gemini 3.x models spend output tokens on internal reasoning before the JSON, so
 * maxOutputTokens must be generous even for small schemas.
 */
async function generateContent({
  text,
  imageBuffer,
  mimeType = 'image/jpeg',
  maxOutputTokens = 4096,
  temperature = 0.1,
  responseSchema = null,
  timeoutMs = 25000,
} = {}) {
  if (!apiKeyConfigured()) {
    throw new ApiError(503, 'Gemini is not configured. Set GEMINI_API_KEY in backend/.env');
  }

  const parts = [];
  if (imageBuffer?.length) {
    parts.push({
      inline_data: {
        mime_type: mimeType || 'image/jpeg',
        data: Buffer.from(imageBuffer).toString('base64'),
      },
    });
  }
  if (text) parts.push({ text });

  const generationConfig = {
    temperature,
    maxOutputTokens,
    responseMimeType: 'application/json',
  };
  if (responseSchema) generationConfig.responseSchema = responseSchema;

  const body = JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig });
  const attempts = [];
  let lastError = null;

  for (const model of orderedModels()) {
    // One attempt per model for capacity errors (503/429/404); a second attempt only for
    // transient network/timeout failures.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let moveToNextModel = false;
      try {
        const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': env.GEMINI_API_KEY.trim(),
          },
          body,
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        const ms = Date.now() - started;

        if (res.ok) {
          const textOut =
            json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || '';
          const finish = json?.candidates?.[0]?.finishReason;
          attempts.push({ model, attempt, status: res.status, ms, finish });
          const parsed = parseJsonText(textOut);
          if (!parsed) {
            lastError = new ApiError(502, `Gemini returned non-JSON output (${finish || 'unknown'})`);
            logger.warn('gemini.non_json', { model, finish, sample: textOut.slice(0, 200) });
            moveToNextModel = true;
          } else {
            return { text: textOut.trim(), json: parsed, raw: json, model, attempts };
          }
        } else {
          const msg = json?.error?.message || json?.message || `Gemini request failed (${res.status})`;
          attempts.push({ model, attempt, status: res.status, ms, error: msg.slice(0, 160) });
          lastError = new ApiError(res.status === 429 ? 429 : 502, msg);
          if (!isRetryableStatus(res.status)) throw lastError;
          markUnhealthy(model, res.status);
          moveToNextModel = true;
        }
      } catch (err) {
        if (err instanceof ApiError && !isRetryableStatus(err.statusCode)) throw err;
        const aborted = err?.name === 'AbortError';
        attempts.push({ model, attempt, status: aborted ? 'timeout' : 'network', ms: Date.now() - started });
        lastError = aborted ? new ApiError(504, 'Gemini request timed out') : err;
        if (attempt === 0) await sleep(400);
      } finally {
        clearTimeout(timer);
      }
      if (moveToNextModel) break;
    }
  }

  logger.warn('gemini.exhausted', { attempts });
  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(502, lastError?.message || 'Gemini unavailable');
}

/* ------------------------------------------------------------------------------------------------
 * Response schemas (OpenAPI subset accepted by generationConfig.responseSchema)
 * ---------------------------------------------------------------------------------------------- */

const strArr = (maxItems = 12) => ({ type: 'ARRAY', items: { type: 'STRING' }, maxItems });

const UNIVERSAL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    imageType: { type: 'STRING', enum: IMAGE_TYPES },
    confidence: { type: 'NUMBER' },
    description: { type: 'STRING' },
    quality: {
      type: 'OBJECT',
      properties: {
        usable: { type: 'BOOLEAN' },
        issues: strArr(6),
      },
      required: ['usable'],
    },
    detectedObjects: strArr(15),
    people: {
      type: 'OBJECT',
      properties: {
        count: { type: 'INTEGER' },
        faceVisible: { type: 'BOOLEAN' },
        faceCoverage: { type: 'STRING', enum: ['full', 'partial', 'none'] },
        bodyCoverage: { type: 'STRING', enum: ['full', 'upper', 'lower', 'hands_only', 'none'] },
        gender: { type: 'STRING', enum: ['men', 'women', 'ambiguous', 'none'] },
        genderConfidence: { type: 'NUMBER' },
        ageGroup: { type: 'STRING', enum: ['adult', 'teen', 'child', 'unknown'] },
      },
      required: ['count', 'faceVisible', 'faceCoverage', 'bodyCoverage', 'gender', 'genderConfidence'],
    },
    visibleProducts: {
      type: 'ARRAY',
      maxItems: 10,
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          colors: strArr(4),
          material: { type: 'STRING' },
          targetGender: { type: 'STRING', enum: ['men', 'women', 'unisex', 'unknown'] },
        },
        required: ['type'],
      },
    },
    dominantColors: strArr(6),
    style: strArr(6),
    possibleNeeds: strArr(8),
    recommendedAnalysisType: { type: 'STRING', enum: ['face', 'body', 'furniture', 'none'] },
    reason: { type: 'STRING' },
  },
  required: [
    'imageType',
    'confidence',
    'description',
    'quality',
    'detectedObjects',
    'people',
    'dominantColors',
    'recommendedAnalysisType',
    'reason',
  ],
};

const FACE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    faceVisible: { type: 'BOOLEAN' },
    faceCoverage: { type: 'STRING', enum: ['full', 'partial', 'none'] },
    faceCount: { type: 'INTEGER' },
    gender: { type: 'STRING', enum: ['men', 'women', 'ambiguous'] },
    genderConfidence: { type: 'NUMBER' },
    faceShape: { type: 'STRING', enum: ['oval', 'round', 'square', 'heart', 'oblong', 'diamond', 'unknown'] },
    skinTone: { type: 'STRING', enum: ['fair', 'light', 'medium', 'tan', 'deep', 'unknown'] },
    undertone: { type: 'STRING', enum: ['cool', 'warm', 'neutral', 'unknown'] },
    hairColor: { type: 'STRING' },
    eyewearPresent: { type: 'BOOLEAN' },
    headwearPresent: { type: 'BOOLEAN' },
    facialHair: { type: 'STRING', enum: ['none', 'stubble', 'beard', 'mustache', 'unknown'] },
    skinAppearance: {
      type: 'OBJECT',
      properties: {
        type: { type: 'STRING', enum: ['dry', 'oily', 'combination', 'normal', 'unknown'] },
        observations: strArr(6),
      },
      required: ['type', 'observations'],
    },
    accessoryFit: {
      type: 'OBJECT',
      properties: {
        sunglassesStyles: strArr(4),
        hatStyles: strArr(4),
        flatteringColors: strArr(6),
        avoidColors: strArr(4),
      },
    },
    upperBodyClothingVisible: { type: 'BOOLEAN' },
    notes: { type: 'STRING' },
  },
  required: ['faceVisible', 'faceCoverage', 'faceCount', 'gender', 'genderConfidence', 'faceShape', 'skinTone', 'undertone', 'skinAppearance', 'notes'],
};

const BODY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    personPresent: { type: 'BOOLEAN' },
    personCount: { type: 'INTEGER' },
    bodyCoverage: { type: 'STRING', enum: ['full', 'upper', 'lower', 'feet', 'hands_only', 'none'] },
    gender: { type: 'STRING', enum: ['men', 'women', 'ambiguous', 'none'] },
    genderConfidence: { type: 'NUMBER' },
    build: { type: 'STRING', enum: ['slim', 'average', 'athletic', 'curvy', 'plus', 'unknown'] },
    garments: {
      type: 'ARRAY',
      maxItems: 8,
      items: {
        type: 'OBJECT',
        properties: {
          slot: { type: 'STRING', enum: ['upper', 'lower', 'full', 'shoes', 'bag', 'head', 'face', 'hands', 'neck'] },
          type: { type: 'STRING' },
          colors: strArr(3),
          pattern: { type: 'STRING' },
          material: { type: 'STRING' },
          fit: { type: 'STRING' },
        },
        required: ['slot', 'type', 'colors'],
      },
    },
    styleTags: strArr(6),
    season: { type: 'STRING', enum: ['spring', 'summer', 'autumn', 'winter', 'all', 'unknown'] },
    occasion: { type: 'STRING' },
    dominantColors: strArr(6),
    complements: {
      type: 'ARRAY',
      maxItems: 6,
      items: {
        type: 'OBJECT',
        properties: {
          slot: { type: 'STRING', enum: ['upper', 'lower', 'full', 'shoes', 'bag', 'head', 'face', 'hands', 'neck'] },
          types: strArr(5),
          colors: strArr(5),
          avoidColors: strArr(4),
          reason: { type: 'STRING' },
        },
        required: ['slot', 'types', 'colors', 'reason'],
      },
    },
    notes: { type: 'STRING' },
  },
  required: ['personPresent', 'personCount', 'bodyCoverage', 'gender', 'genderConfidence', 'garments', 'styleTags', 'dominantColors', 'complements', 'notes'],
};

const FURNITURE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isHomeScene: { type: 'BOOLEAN' },
    primaryType: {
      type: 'STRING',
      enum: ['sofa', 'armchair', 'chair', 'bed', 'table', 'desk', 'shelf', 'cabinet', 'curtain', 'cushion', 'rug', 'lamp', 'room', 'other'],
    },
    items: {
      type: 'ARRAY',
      maxItems: 10,
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING' },
          material: { type: 'STRING' },
          colors: strArr(3),
          style: { type: 'STRING' },
        },
        required: ['type', 'colors'],
      },
    },
    roomType: { type: 'STRING', enum: ['living_room', 'bedroom', 'kitchen', 'dining', 'office', 'bathroom', 'outdoor', 'unknown'] },
    style: { type: 'STRING', enum: ['modern', 'minimal', 'scandinavian', 'classic', 'vintage', 'boho', 'industrial', 'farmhouse', 'glam', 'unknown'] },
    palette: strArr(6),
    existingTextiles: strArr(6),
    complements: {
      type: 'ARRAY',
      maxItems: 6,
      items: {
        type: 'OBJECT',
        properties: {
          productType: {
            type: 'STRING',
            enum: ['cushion-cover', 'blanket', 'curtain', 'bedsheet', 'mattress-topper', 'rug', 'decor'],
          },
          colors: strArr(5),
          avoidColors: strArr(4),
          materials: strArr(4),
          priority: { type: 'INTEGER' },
          reason: { type: 'STRING' },
        },
        required: ['productType', 'colors', 'priority', 'reason'],
      },
    },
    notes: { type: 'STRING' },
  },
  required: ['isHomeScene', 'primaryType', 'items', 'roomType', 'style', 'palette', 'complements', 'notes'],
};

const RERANK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    results: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          relevance: { type: 'INTEGER' },
          verdict: { type: 'STRING', enum: ['good', 'acceptable', 'bad'] },
          reason: { type: 'STRING' },
        },
        required: ['id', 'relevance', 'verdict', 'reason'],
      },
    },
  },
  required: ['results'],
};

/* ------------------------------------------------------------------------------------------------
 * Stage 1 — universal image understanding
 * ---------------------------------------------------------------------------------------------- */

function clamp01(n, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}

const arr = (v, max = 12) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : []);

async function understandImage(buffer, { mimeType = 'image/jpeg' } = {}) {
  const prompt = `You are the image-understanding stage of a retail shopping assistant for Scosha (fashion, footwear, bags, home textiles such as curtains, cushion covers, blankets, bed sheets, mattress toppers).
Describe ONLY what is actually visible. Never guess. If unsure, lower confidence.

Classify imageType:
- "face": a human face is the main subject (headshot / selfie / head-and-shoulders).
- "body": a person where the body or outfit is a main subject (full body, 3/4, upper body with clothing, legs, feet in shoes).
- "clothing": a garment, shoe, bag or accessory shown WITHOUT a person wearing it (product shot, flat lay, hanger).
- "furniture": furniture, a room interior, or home textiles (sofa, chair, bed, table, curtains, cushions, rugs).
- "vehicle", "food", "animal", "landscape": those subjects.
- "screenshot": a screen capture, app UI, webpage, or a photo whose subject is a screen/monitor.
- "document": text, receipt, paper, QR codes.
- "blank": uniform/empty image; "blurry": unusable focus/exposure.
- "other": anything else (tools, electronics, toys, buildings...).

Rules:
- people.gender: only "men" or "women" when it is clearly evident; otherwise "ambiguous". genderConfidence 0-1.
- faceCoverage "full" means the whole face is visible and front-ish; "partial" means cut off, turned away, obstructed or very small.
- bodyCoverage describes how much of a person's body/outfit is visible.
- visibleProducts: list concrete items (e.g. "leather sofa", "white button-up shirt", "aviator sunglasses") with plain-English colors.
- recommendedAnalysisType: "face" only when a face is the main subject; "body" for outfit/clothing images (including clothing product shots); "furniture" for home scenes; otherwise "none".
- reason: one sentence explaining the classification.`;

  const { json, model, attempts } = await generateContent({
    text: prompt,
    imageBuffer: buffer,
    mimeType,
    temperature: 0,
    responseSchema: UNIVERSAL_SCHEMA,
  });

  const imageType = IMAGE_TYPES.includes(json.imageType) ? json.imageType : 'other';
  const people = json.people || {};
  return {
    imageType,
    confidence: clamp01(json.confidence, 0.4),
    description: String(json.description || '').slice(0, 300),
    quality: {
      usable: json.quality?.usable !== false,
      issues: arr(json.quality?.issues, 6),
    },
    detectedObjects: arr(json.detectedObjects, 15),
    people: {
      count: Number.isFinite(Number(people.count)) ? Number(people.count) : 0,
      faceVisible: Boolean(people.faceVisible),
      faceCoverage: ['full', 'partial', 'none'].includes(people.faceCoverage) ? people.faceCoverage : 'none',
      bodyCoverage: ['full', 'upper', 'lower', 'hands_only', 'none'].includes(people.bodyCoverage)
        ? people.bodyCoverage
        : 'none',
      gender: ['men', 'women', 'ambiguous', 'none'].includes(people.gender) ? people.gender : 'ambiguous',
      genderConfidence: clamp01(people.genderConfidence, 0),
      ageGroup: people.ageGroup || 'unknown',
    },
    visibleProducts: Array.isArray(json.visibleProducts)
      ? json.visibleProducts
          .filter((p) => p && p.type)
          .slice(0, 10)
          .map((p) => ({
            type: String(p.type).toLowerCase(),
            colors: arr(p.colors, 4).map((c) => c.toLowerCase()),
            material: p.material ? String(p.material).toLowerCase() : null,
            targetGender: ['men', 'women', 'unisex', 'unknown'].includes(p.targetGender) ? p.targetGender : 'unknown',
          }))
      : [],
    dominantColors: arr(json.dominantColors, 6).map((c) => c.toLowerCase()),
    style: arr(json.style, 6).map((c) => c.toLowerCase()),
    possibleNeeds: arr(json.possibleNeeds, 8),
    recommendedAnalysisType: ['face', 'body', 'furniture', 'none'].includes(json.recommendedAnalysisType)
      ? json.recommendedAnalysisType
      : 'none',
    reason: String(json.reason || '').slice(0, 300),
    isUnsupported: UNSUPPORTED_TYPES.has(imageType),
    isLowQuality: LOW_QUALITY_TYPES.has(imageType) || json.quality?.usable === false,
    provider: 'gemini',
    model,
    attempts,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Stage 2 — specialized analyzers
 * ---------------------------------------------------------------------------------------------- */

async function analyzeFace(buffer, { mimeType = 'image/jpeg' } = {}) {
  const prompt = `You are a cosmetic styling analyst (NOT a medical professional). Analyze the face in this photo for shopping purposes only.
- Do not diagnose any medical condition. skinAppearance.observations are cosmetic, e.g. "slight shine on T-zone", "visible dryness on cheeks", "even tone".
- faceShape / skinTone / undertone: choose "unknown" if the lighting or angle prevents a reliable read.
- accessoryFit: which sunglasses frame styles (e.g. aviator, wayfarer, round, cat-eye, rectangular) and hat styles (e.g. fedora, beanie, bucket, cap, wide-brim) flatter this face shape; flatteringColors are plain color names that suit the skin undertone; avoidColors likewise.
- faceVisible: true when at least one human face is visible.
- faceCoverage describes HOW MUCH of the face is visible: "full" = whole face visible and roughly front-facing; "partial" = turned away, cropped, obstructed or small; "none" = no face visible at all (only use "none" when faceVisible is false).
- gender: "ambiguous" unless clearly evident.
- upperBodyClothingVisible: true if a shirt/top/jacket is clearly visible.
- notes: one friendly sentence.`;
  const { json, model } = await generateContent({
    text: prompt,
    imageBuffer: buffer,
    mimeType,
    temperature: 0.1,
    responseSchema: FACE_SCHEMA,
  });
  const faceVisible = Boolean(json.faceVisible);
  let faceCoverage = ['full', 'partial', 'none'].includes(json.faceCoverage) ? json.faceCoverage : 'none';
  // Models occasionally answer "none" meaning "no obstruction" — reconcile with faceVisible.
  if (faceVisible && faceCoverage === 'none') faceCoverage = 'full';
  if (!faceVisible) faceCoverage = 'none';
  return {
    faceVisible,
    faceCoverage,
    faceCount: Number(json.faceCount) || 0,
    gender: ['men', 'women', 'ambiguous'].includes(json.gender) ? json.gender : 'ambiguous',
    genderConfidence: clamp01(json.genderConfidence, 0),
    faceShape: json.faceShape || 'unknown',
    skinTone: json.skinTone || 'unknown',
    undertone: json.undertone || 'unknown',
    hairColor: json.hairColor ? String(json.hairColor).toLowerCase() : null,
    eyewearPresent: Boolean(json.eyewearPresent),
    headwearPresent: Boolean(json.headwearPresent),
    facialHair: json.facialHair || 'unknown',
    skinAppearance: {
      type: json.skinAppearance?.type || 'unknown',
      observations: arr(json.skinAppearance?.observations, 6),
    },
    accessoryFit: {
      sunglassesStyles: arr(json.accessoryFit?.sunglassesStyles, 4).map((s) => s.toLowerCase()),
      hatStyles: arr(json.accessoryFit?.hatStyles, 4).map((s) => s.toLowerCase()),
      flatteringColors: arr(json.accessoryFit?.flatteringColors, 6).map((s) => s.toLowerCase()),
      avoidColors: arr(json.accessoryFit?.avoidColors, 4).map((s) => s.toLowerCase()),
    },
    upperBodyClothingVisible: Boolean(json.upperBodyClothingVisible),
    notes: String(json.notes || '').slice(0, 300),
    model,
  };
}

async function analyzeBody(buffer, { mimeType = 'image/jpeg', bodyArea = 'full' } = {}) {
  const prompt = `You are a fashion stylist analyzing a photo for outfit recommendations from a real catalog.
Customer focus area: "${bodyArea}" (full, upper, legs, shoes, or bags).

Instructions:
- garments: every clothing/footwear/accessory item actually visible on the person (or the product itself if no person). Use slots: upper (shirt, jacket, coat, cardigan, hoodie, top), lower (pants, jeans, skirt, shorts), full (dress, suit, tracksuit, 2-piece set), shoes, bag, head (hat), face (sunglasses), hands (gloves), neck (scarf).
- complements: what would complete or upgrade this look, as concrete product TYPES per slot (e.g. slot "lower", types ["straight-leg trousers","dark jeans"], colors ["navy","charcoal"]). Base colors on what pairs well with the visible outfit; avoidColors are colors that would clash. Include at most 5 complement entries and prioritize the customer's focus area. Do NOT suggest a slot that is already well covered unless replacing it would clearly improve the look.
- gender: "men"/"women" only when clearly evident from the person; for a garment-only photo infer from the garment cut when obvious, otherwise "ambiguous".
- build: visual impression only; "unknown" if not visible.
- styleTags: e.g. casual, smart-casual, formal, streetwear, sporty, elegant, minimal, boho, vintage, business.
- notes: one friendly sentence describing the look.`;
  const { json, model } = await generateContent({
    text: prompt,
    imageBuffer: buffer,
    mimeType,
    temperature: 0.1,
    responseSchema: BODY_SCHEMA,
  });
  const slots = ['upper', 'lower', 'full', 'shoes', 'bag', 'head', 'face', 'hands', 'neck'];
  return {
    personPresent: Boolean(json.personPresent),
    personCount: Number(json.personCount) || 0,
    bodyCoverage: json.bodyCoverage || 'none',
    gender: ['men', 'women', 'ambiguous', 'none'].includes(json.gender) ? json.gender : 'ambiguous',
    genderConfidence: clamp01(json.genderConfidence, 0),
    build: json.build || 'unknown',
    garments: (Array.isArray(json.garments) ? json.garments : [])
      .filter((g) => g && slots.includes(g.slot))
      .map((g) => ({
        slot: g.slot,
        type: String(g.type || '').toLowerCase(),
        colors: arr(g.colors, 3).map((c) => c.toLowerCase()),
        pattern: g.pattern ? String(g.pattern).toLowerCase() : null,
        material: g.material ? String(g.material).toLowerCase() : null,
        fit: g.fit ? String(g.fit).toLowerCase() : null,
      })),
    styleTags: arr(json.styleTags, 6).map((s) => s.toLowerCase()),
    season: json.season || 'unknown',
    occasion: json.occasion ? String(json.occasion).toLowerCase() : null,
    dominantColors: arr(json.dominantColors, 6).map((c) => c.toLowerCase()),
    complements: (Array.isArray(json.complements) ? json.complements : [])
      .filter((c) => c && slots.includes(c.slot))
      .map((c) => ({
        slot: c.slot,
        types: arr(c.types, 5).map((t) => t.toLowerCase()),
        colors: arr(c.colors, 5).map((t) => t.toLowerCase()),
        avoidColors: arr(c.avoidColors, 4).map((t) => t.toLowerCase()),
        reason: String(c.reason || '').slice(0, 200),
      })),
    notes: String(json.notes || '').slice(0, 300),
    model,
  };
}

async function analyzeFurniture(buffer, { mimeType = 'image/jpeg' } = {}) {
  const prompt = `You are an interior stylist. Analyze this home/furniture photo for recommending complementary home textiles from a real catalog.
The catalog ONLY contains these home product types: cushion-cover, blanket (throws / fleece blankets), curtain (sheer, linen, blackout), bedsheet (bed sheet sets), mattress-topper. There are no sofas, chairs, tables or lamps for sale.

Instructions:
- items: every significant furniture/decor item visible with its material and plain-English colors.
- palette: the room's dominant colors (walls, floor, main furniture).
- existingTextiles: textiles already present (e.g. "grey cushions", "white curtains").
- complements: which of the allowed product types would genuinely complement THIS scene, with colors that harmonize with the palette (include both tone-on-tone and tasteful contrast options), materials that suit the style, priority 1 = best. Examples: sofa/armchair → cushion-cover and blanket; bed/bedroom → bedsheet, blanket, cushion-cover, mattress-topper; bare window → curtain. Do NOT recommend curtains if no window/wall space is relevant, and do NOT recommend bed items for a living room unless a daybed is visible.
- avoidColors: colors that would clash with the palette.
- notes: one friendly sentence describing the space.`;
  const { json, model } = await generateContent({
    text: prompt,
    imageBuffer: buffer,
    mimeType,
    temperature: 0.1,
    responseSchema: FURNITURE_SCHEMA,
  });
  const allowedTypes = ['cushion-cover', 'blanket', 'curtain', 'bedsheet', 'mattress-topper', 'rug', 'decor'];
  return {
    isHomeScene: Boolean(json.isHomeScene),
    primaryType: json.primaryType || 'other',
    items: (Array.isArray(json.items) ? json.items : [])
      .filter((i) => i && i.type)
      .slice(0, 10)
      .map((i) => ({
        type: String(i.type).toLowerCase(),
        material: i.material ? String(i.material).toLowerCase() : null,
        colors: arr(i.colors, 3).map((c) => c.toLowerCase()),
        style: i.style ? String(i.style).toLowerCase() : null,
      })),
    roomType: json.roomType || 'unknown',
    style: json.style || 'unknown',
    palette: arr(json.palette, 6).map((c) => c.toLowerCase()),
    existingTextiles: arr(json.existingTextiles, 6).map((c) => c.toLowerCase()),
    complements: (Array.isArray(json.complements) ? json.complements : [])
      .filter((c) => c && allowedTypes.includes(c.productType))
      .map((c) => ({
        productType: c.productType,
        colors: arr(c.colors, 5).map((t) => t.toLowerCase()),
        avoidColors: arr(c.avoidColors, 4).map((t) => t.toLowerCase()),
        materials: arr(c.materials, 4).map((t) => t.toLowerCase()),
        priority: Number(c.priority) || 9,
        reason: String(c.reason || '').slice(0, 200),
      }))
      .sort((a, b) => a.priority - b.priority),
    notes: String(json.notes || '').slice(0, 300),
    model,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Stage 3 — AI matching / rerank of DB candidates (text only)
 * ---------------------------------------------------------------------------------------------- */

/**
 * @param {object} args
 * @param {string} args.context  Short natural-language description of the image + needs.
 * @param {Array<{id:string, text:string}>} args.candidates  Catalog candidates (already DB-filtered).
 */
async function rerankCandidates({ context, candidates, maxOutputTokens = 6144 }) {
  if (!candidates?.length) return { results: [], model: null };
  const list = candidates.map((c) => `- id=${c.id} :: ${c.text}`).join('\n');
  const prompt = `You are the final relevance judge for a shopping assistant. The customer uploaded a photo; here is what we know:
${context}

Below are catalog products that passed database filters. Score EACH product's relevance for THIS customer on 0-100 and give a verdict:
- "good" (clearly relevant: right product type AND harmonizes in color/style/use) → relevance 70-100,
- "acceptable" (right type or right use, and at least loosely suitable — a close color, a neutral color, or the same kind of product) → relevance 50-69,
- "bad" (wrong kind of product for this photo, a strong color clash, wrong gender, or no sensible connection) → relevance 0-49.
Rules:
- Aim for 5 recommendations. Anything at 50 or above is worth showing. Do not reject a product only because the color is unspecified or not the exact shade.
- Age, height, weight, and entered gender are hints. When the context says the photo disagrees, score from the photo.
- When the customer shows a product (e.g. sneakers), similar items should share the product type. A close color is better, but the same type in a neutral color is still acceptable.
- reason: one customer-facing sentence under 12 words, positive and concrete for good/acceptable (e.g. "Sage green corduroy picks up your sofa's tones"); for bad, state the mismatch plainly.
Return every id exactly once. Never invent ids.

Products:
${list}`;
  const { json, model } = await generateContent({
    text: prompt,
    maxOutputTokens,
    temperature: 0,
    responseSchema: RERANK_SCHEMA,
  });
  const known = new Set(candidates.map((c) => String(c.id)));
  const results = (Array.isArray(json.results) ? json.results : [])
    .filter((r) => r && known.has(String(r.id)))
    .map((r) => {
      const relevance = Math.max(0, Math.min(100, Number(r.relevance) || 0));
      let verdict = ['good', 'acceptable', 'bad'].includes(r.verdict) ? r.verdict : 'acceptable';
      // Keep verdict and score consistent: a low score is a rejection regardless of the label.
      if (relevance < 50) verdict = 'bad';
      return { id: String(r.id), relevance, verdict, reason: String(r.reason || '').slice(0, 120) };
    });
  return { results, model };
}

async function validateApiKey() {
  if (!apiKeyConfigured()) return { ok: false, reason: 'missing', model: null };
  try {
    const { json, model } = await generateContent({
      text: 'Reply with JSON {"ok":true}',
      maxOutputTokens: 1024,
      responseSchema: { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } }, required: ['ok'] },
    });
    return { ok: Boolean(json?.ok), reason: null, model };
  } catch (err) {
    return { ok: false, reason: err.message || 'invalid', model: null };
  }
}

module.exports = {
  apiKeyConfigured,
  modelName,
  modelChain,
  generateContent,
  understandImage,
  analyzeFace,
  analyzeBody,
  analyzeFurniture,
  rerankCandidates,
  validateApiKey,
  IMAGE_TYPES,
  UNSUPPORTED_TYPES,
};
