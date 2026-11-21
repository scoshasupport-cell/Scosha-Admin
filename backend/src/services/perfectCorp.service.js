const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 40;

function apiKeyConfigured() {
  return Boolean(env.PERFECT_CORP_API_KEY && env.PERFECT_CORP_API_KEY.trim());
}

function authHeaders(extra = {}) {
  if (!apiKeyConfigured()) {
    throw new ApiError(
      503,
      'Perfect Corp AI is not configured. Set PERFECT_CORP_API_KEY in the server environment.'
    );
  }
  return {
    Authorization: `Bearer ${env.PERFECT_CORP_API_KEY.trim()}`,
    Accept: 'application/json',
    ...extra,
  };
}

async function perfectFetch(path, { method = 'GET', body, headers } = {}) {
  const url = `${env.PERFECT_CORP_API_BASE.replace(/\/$/, '')}${path}`;
  const init = {
    method,
    headers: authHeaders(headers || {}),
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    logger.warn('Perfect Corp API error', { path, status: res.status, json });
    const code = json?.error_code || json?.data?.error_code;
    const raw =
      json?.message ||
      json?.error ||
      json?.data?.message ||
      `Perfect Corp request failed (${res.status})`;
    let message = String(raw);
    if (code === 'InvalidApiKey' || /api key.*(not recognized|invalid)/i.test(message)) {
      message =
        'Perfect Corp API key is invalid or inactive. Create a new key at https://yce.makeupar.com/api-console/en/api-keys/ and set PERFECT_CORP_API_KEY in backend/.env';
    } else if (code === 'InactiveApiKey') {
      message = 'Perfect Corp API key is inactive. Activate it in the YouCam API console.';
    } else if (code === 'ExpiredApiKey') {
      message = 'Perfect Corp API key has expired. Generate a new key in the YouCam API console.';
    }
    throw new ApiError(res.status === 401 ? 502 : 502, message);
  }
  return json;
}

/** Live check against Perfect Corp (does not throw). */
async function validateApiKey() {
  if (!apiKeyConfigured()) {
    return { ok: false, reason: 'missing' };
  }
  try {
    await perfectFetch('/s2s/v2.0/file', {
      method: 'POST',
      body: {
        files: [{ content_type: 'image/jpeg', file_name: 'ping.jpg', file_size: 1024 }],
      },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message || 'invalid' };
  }
}

/**
 * Create a Perfect Corp file slot and upload the image buffer.
 * @returns {{ fileId: string }}
 */
async function uploadImageBuffer(buffer, { fileName = 'scan.jpg', contentType = 'image/jpeg' } = {}) {
  const create = await perfectFetch('/s2s/v2.0/file', {
    method: 'POST',
    body: {
      files: [
        {
          content_type: contentType,
          file_name: fileName,
          file_size: buffer.length,
        },
      ],
    },
  });

  const fileMeta = create?.data?.files?.[0] || create?.files?.[0];
  if (!fileMeta?.file_id || !fileMeta?.requests?.[0]?.url) {
    throw new ApiError(502, 'Perfect Corp file upload response incomplete');
  }

  const put = fileMeta.requests[0];
  const putHeaders = { ...(put.headers || {}) };
  putHeaders['Content-Type'] = contentType;
  putHeaders['Content-Length'] = String(buffer.length);

  const uploadRes = await fetch(put.url, {
    method: put.method || 'PUT',
    headers: putHeaders,
    body: buffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    logger.warn('Perfect Corp S3 upload failed', { status: uploadRes.status, errText });
    throw new ApiError(502, 'Failed to upload image to Perfect Corp storage');
  }

  return { fileId: fileMeta.file_id };
}

async function pollTask(getPath, taskId) {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i += 1) {
    const result = await perfectFetch(`${getPath}/${encodeURIComponent(taskId)}`);
    const status =
      result?.data?.task_status ||
      result?.data?.status ||
      result?.task_status ||
      result?.status;

    if (status === 'success' || status === 'Success' || status === 200) {
      return result?.data || result;
    }
    if (status === 'error' || status === 'failed' || status === 'Error') {
      throw new ApiError(
        502,
        result?.data?.error_message || result?.message || 'Perfect Corp task failed'
      );
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new ApiError(502, 'Perfect Corp task timed out');
}

/**
 * Run AI Skin Analysis V2.1 (face). Returns JSON analysis when format=json.
 */
async function runSkinAnalysis(fileId) {
  const created = await perfectFetch('/s2s/v2.1/task/skin-analysis', {
    method: 'POST',
    body: {
      src_file_id: fileId,
      dst_actions: ['hd_wrinkle', 'hd_pore', 'hd_texture', 'hd_acne'],
      format: 'json',
    },
  });

  const taskId =
    created?.data?.task_id || created?.data?.id || created?.task_id || created?.id;
  if (!taskId) {
    // Some responses return results inline
    if (created?.data?.results || created?.data?.score_info) return created.data;
    throw new ApiError(502, 'Perfect Corp skin analysis did not return a task id');
  }

  return pollTask('/s2s/v2.1/task/skin-analysis', taskId);
}

/**
 * AI Clothes Virtual Try-On V4 — person file + garment file id or public URL.
 */
async function runClothTryOn({
  personFileId,
  garmentFileId,
  garmentUrl,
  garmentCategory = 'auto',
}) {
  const body = {
    src_file_id: personFileId,
    garment_category: garmentCategory,
    filter_multi_person: 'off',
  };
  if (garmentFileId) body.ref_file_id = garmentFileId;
  else if (garmentUrl) body.ref_file_url = garmentUrl;
  else throw new ApiError(400, 'Garment file id or URL is required for try-on');

  const created = await perfectFetch('/s2s/v2.0/task/cloth-v4', {
    method: 'POST',
    body,
  });
  const taskId = created?.data?.task_id || created?.task_id;
  if (!taskId) return created?.data || created;
  return pollTask('/s2s/v2.0/task/cloth-v4', taskId);
}

module.exports = {
  apiKeyConfigured,
  validateApiKey,
  uploadImageBuffer,
  runSkinAnalysis,
  runClothTryOn,
};
