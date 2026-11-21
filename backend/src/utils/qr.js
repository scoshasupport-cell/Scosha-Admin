const QRCode = require('qrcode');

/**
 * Build the customer-facing order tracking URL for emails / QR codes.
 * @param {object} order
 * @param {string} [storeUrl]
 */
function orderTrackUrl(order, storeUrl) {
  const base = String(
    storeUrl || process.env.STOREFRONT_URL || process.env.APP_URL || 'https://scosha.com',
  ).replace(/\/$/, '');
  const id = order.id || order._id || '';
  return `${base}/orders/${id}`;
}

/**
 * Public image URL for QR (email clients that block data: URIs).
 * @param {string} data
 * @param {number} [size]
 */
function qrImageUrl(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`;
}

/**
 * PNG buffer for embedding QR in PDFs.
 * @param {string} data
 * @param {number} [width]
 * @returns {Promise<Buffer>}
 */
async function qrPngBuffer(data, width = 180) {
  return QRCode.toBuffer(data, {
    type: 'png',
    width,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

module.exports = {
  orderTrackUrl,
  qrImageUrl,
  qrPngBuffer,
};
