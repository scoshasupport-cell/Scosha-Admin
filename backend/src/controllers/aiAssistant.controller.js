const multer = require('multer');
const aiRecommend = require('../services/aiRecommend.service');
const perfectCorp = require('../services/perfectCorp.service');
const gemini = require('../services/gemini.service');
const catalogIndex = require('../services/catalogIndex.service');
const { env } = require('../config/env');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
    return cb(null, true);
  },
});

const uploadMiddleware = upload.single('image');
const uploadTryOnMiddleware = upload.single('image');

function parseColors(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).slice(0, 8);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).slice(0, 8);
  } catch {
    /* comma list */
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseMeasurements(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const getStatus = asyncHandler(async (_req, res) => {
  const configured = perfectCorp.apiKeyConfigured();
  let keyValid = null;
  let keyError = null;
  if (configured) {
    const check = await perfectCorp.validateApiKey();
    keyValid = check.ok;
    keyError = check.ok ? null : check.reason;
  }

  const geminiConfigured = gemini.apiKeyConfigured();
  let geminiKeyValid = null;
  let geminiKeyError = null;
  let geminiActiveModel = null;
  if (geminiConfigured) {
    const check = await gemini.validateApiKey();
    geminiKeyValid = check.ok;
    geminiKeyError = check.ok ? null : check.reason;
    geminiActiveModel = check.model || null;
  }

  let catalogSummary = null;
  try {
    catalogSummary = catalogIndex.summarizeIndex(await catalogIndex.getCatalogIndex());
  } catch {
    catalogSummary = null;
  }
  const beautyCatalogLive = Boolean(catalogSummary?.byDomain?.beauty);
  const faceAccessoriesLive = Boolean(catalogSummary?.byType?.sunglasses || catalogSummary?.byType?.hat);

  return ApiResponse.success(
    res,
    {
      perfectCorpConfigured: configured,
      perfectCorpKeyValid: keyValid,
      perfectCorpKeyError: keyError,
      geminiConfigured,
      geminiKeyValid,
      geminiKeyError,
      geminiModel: gemini.modelName(),
      geminiModelChain: gemini.modelChain(),
      geminiActiveModel,
      pipeline: 'understand → gate → specialized analysis → catalog filter → score → AI rerank → validate',
      features: {
        face: {
          provider: 'gemini-face-analysis' + (configured ? '+perfectcorp-skin-scores' : ''),
          catalogMatch: beautyCatalogLive || faceAccessoriesLive,
        },
        body: { provider: 'gemini-outfit-analysis+catalog', sizeCheck: 'measurements', tryOn: configured ? 'cloth-v4' : 'unavailable' },
        furniture: { provider: 'gemini-scene-analysis+catalog' },
        auto: { provider: 'gemini-universal-classifier' },
      },
      catalog: catalogSummary,
      beautyCatalogLive,
      beautyHref: '/skincare',
      resultPolicy: 'Returns up to 5 in-catalog products, each at least 50% relevant to the photo.',
      missingServices: [
        ...(geminiConfigured
          ? []
          : [{ id: 'vision', name: 'Google Gemini', why: 'Required for image understanding and recommendations.' }]),
        ...(beautyCatalogLive
          ? []
          : [
              {
                id: 'beauty-catalog',
                name: 'Active beauty/skincare products in Scosha DB',
                why: 'Face scan produces a skin/face report but has no skincare products to recommend.',
              },
            ]),
        ...(faceAccessoriesLive
          ? []
          : [
              {
                id: 'face-accessories',
                name: 'Sunglasses / hats in Scosha DB',
                why: 'Face scan identifies flattering frame and hat styles but the catalog has none to show.',
              },
            ]),
        {
          id: 'body-measurement',
          name: 'Photo-based body measurement API (optional)',
          why: 'Sizes are currently estimated from customer-entered measurements, not from the photo.',
        },
      ],
    },
    'AI assistant status'
  );
});

const analyze = asyncHandler(async (req, res) => {
  if (!req.file?.buffer?.length) {
    throw ApiError.badRequest('Image file is required');
  }

  const rawMode = String(req.body.mode || '').toLowerCase();
  const modeAlias = { home: 'furniture', gallery: 'body', upload: 'auto' };
  const mode = modeAlias[rawMode] || rawMode;
  if (!['face', 'body', 'furniture', 'auto'].includes(mode)) {
    throw ApiError.badRequest('mode must be face, body, furniture, or auto');
  }

  const gender = String(req.body.gender || '').toLowerCase() || null;
  const bodyArea = String(req.body.bodyArea || req.body.body_area || 'full').toLowerCase();
  const colors = parseColors(req.body.colors);
  const measurements = parseMeasurements(req.body.measurements);
  const confirmed = ['1', 'true', 'yes'].includes(String(req.body.confirmed || '').toLowerCase());
  const includeDebug = Boolean(env.AI_DEBUG_RESPONSE) && !env.isProd;

  const data = await aiRecommend.recommend(req.file.buffer, {
    mode,
    gender: gender === 'men' || gender === 'women' ? gender : null,
    bodyArea,
    colors,
    measurements,
    confirmed,
    fileName: req.file.originalname || 'scan.jpg',
    contentType: req.file.mimetype || 'image/jpeg',
    includeDebug,
  });

  const messages = {
    ok: 'Recommendations ready',
    no_matches: 'Analysis complete — no relevant products',
    mismatch: 'Image does not match the selected scan',
    unsupported: 'Unsupported image',
    unclear: 'Please confirm the photo type',
    needs_input: 'More information needed',
    error: 'Analysis unavailable',
  };
  return ApiResponse.success(res, data, messages[data.status] || 'Analysis complete');
});

const tryOn = asyncHandler(async (req, res) => {
  const productId = req.body.productId || req.body.product_id;
  if (!productId) throw ApiError.badRequest('productId is required');

  const data = await aiRecommend.virtualTryOn({
    personBuffer: req.file?.buffer || null,
    productId,
    personFileId: req.body.personFileId || req.body.fileId || null,
    fileName: req.file?.originalname || 'person.jpg',
    contentType: req.file?.mimetype || 'image/jpeg',
  });

  return ApiResponse.success(res, data, data.message || 'Try-on complete');
});

module.exports = {
  uploadMiddleware,
  uploadTryOnMiddleware,
  getStatus,
  analyze,
  tryOn,
};
