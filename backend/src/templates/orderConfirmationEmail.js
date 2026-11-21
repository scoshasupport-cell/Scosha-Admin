const {
  formatUsd,
  formatLbp,
  formatOrderDateParts,
  orderReference,
  resolveUsdToLbp,
} = require('../utils/orderMoney');
const { orderTrackUrl, qrImageUrl } = require('../utils/qr');

function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Zara/Bershka-style COD order confirmation email (same layout as AMAZ).
 * @param {object} order mapped order
 * @param {object} [settings]
 */
function orderConfirmationEmail(order, settings = {}) {
  const addr = order.shippingAddress || {};
  const rate = resolveUsdToLbp(settings);
  const { date, time } = formatOrderDateParts(order.createdAt);
  const ref = orderReference(order);
  const customerName = addr.name || order.customerName || 'Customer';
  const storeUrl = process.env.STOREFRONT_URL || process.env.APP_URL || 'https://scosha.com';
  const manageUrl = orderTrackUrl(order, storeUrl);
  const qrSrc = qrImageUrl(manageUrl, 200);
  const itemCount = (order.items || []).reduce((n, i) => n + Number(i.quantity || 0), 0);

  const itemBlocks = (order.items || [])
    .map((item) => {
      const thumb = item.imageUrl || item.image || '';
      const unit = Number(item.unitPrice ?? item.price ?? 0);
      const line = Number(item.lineTotal ?? unit * Number(item.quantity || 0));
      const sizeColor = [item.size, item.color].filter(Boolean).join(' ').toUpperCase() || '—';
      return `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;width:72px;">
          ${
            thumb
              ? `<img src="${esc(thumb)}" alt="" width="64" height="80" style="object-fit:cover;display:block;background:#f3f3f3;" />`
              : `<div style="width:64px;height:80px;background:#f3f3f3;"></div>`
          }
        </td>
        <td style="padding:16px 12px;border-bottom:1px solid #e8e8e8;vertical-align:top;">
          <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em;">${esc(item.name)}</div>
          <div style="margin-top:6px;font-size:13px;font-weight:700;">${formatUsd(unit)}</div>
          <div style="margin-top:2px;font-size:11px;color:#888;">${formatLbp(unit, rate)}</div>
          <div style="margin-top:8px;font-size:12px;color:#666;text-transform:uppercase;">
            ${esc(sizeColor)} · QTY ${esc(item.quantity)}
          </div>
          <div style="margin-top:4px;font-size:11px;color:#999;">Ref ${esc(item.sku || ref)}</div>
          <div style="margin-top:2px;font-size:12px;"><strong>Selected size:</strong> ${esc(item.size || '—')}</div>
        </td>
        <td style="padding:16px 0;border-bottom:1px solid #e8e8e8;vertical-align:top;text-align:right;white-space:nowrap;">
          <div style="font-size:13px;font-weight:700;">${formatUsd(line)}</div>
          <div style="font-size:11px;color:#888;">${formatLbp(line, rate)}</div>
        </td>
      </tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order ${esc(ref)}</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="560" style="background:#fff;max-width:560px;width:100%;">
        <tr><td style="padding:28px 24px 8px;">
          <div style="font-size:20px;font-weight:700;letter-spacing:0.12em;">SCOSHA</div>
          <div style="margin-top:16px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;">Order confirmed</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.5;">
            Hi ${esc(customerName)}, thanks for your order.
          </div>
        </td></tr>

        <tr><td style="padding:8px 24px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;">
            <tr>
              <td style="padding:12px 0;width:50%;vertical-align:top;">
                <div style="color:#888;font-size:11px;text-transform:uppercase;">Date</div>
                <div style="font-weight:700;margin-top:2px;">${esc(date)}</div>
              </td>
              <td style="padding:12px 0;width:50%;vertical-align:top;">
                <div style="color:#888;font-size:11px;text-transform:uppercase;">Time</div>
                <div style="font-weight:700;margin-top:2px;">${esc(time)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 12px;vertical-align:top;" colspan="2">
                <div style="color:#888;font-size:11px;text-transform:uppercase;">Reference</div>
                <div style="font-weight:700;margin-top:2px;letter-spacing:0.04em;">${esc(ref)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 24px 20px;">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">Home delivery</div>
          <div style="margin-top:8px;font-size:14px;line-height:1.55;">
            ${esc(addr.name || customerName)}<br/>
            ${addr.phone ? `${esc(addr.phone)}<br/>` : ''}
            ${esc([addr.line1, addr.line2].filter(Boolean).join(', '))}<br/>
            ${esc([addr.city, addr.state, addr.zip].filter(Boolean).join(', '))}<br/>
            ${esc(addr.country || '')}
          </div>
        </td></tr>

        <tr><td style="padding:8px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding-bottom:8px;border-bottom:1px solid #111;">
                Purchase summary
              </td>
              <td style="font-size:12px;color:#666;text-align:right;padding-bottom:8px;border-bottom:1px solid #111;text-transform:uppercase;">
                ${esc(itemCount)} item${itemCount === 1 ? '' : 's'}
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">${itemBlocks}</table>
        </td></tr>

        <tr><td style="padding:8px 24px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
            <tr>
              <td style="padding:6px 0;color:#666;">SUBTOTAL</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;">${formatUsd(order.subtotal)}<br/><span style="font-size:11px;font-weight:400;color:#888;">${formatLbp(order.subtotal, rate)}</span></td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666;">DELIVERY COSTS</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;">${formatUsd(order.shippingCharge)}<br/><span style="font-size:11px;font-weight:400;color:#888;">${formatLbp(order.shippingCharge, rate)}</span></td>
            </tr>
            ${
              Number(order.couponDiscount) > 0
                ? `<tr>
              <td style="padding:6px 0;color:#666;">DISCOUNT</td>
              <td style="padding:6px 0;text-align:right;font-weight:700;">-${formatUsd(order.couponDiscount)}</td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:12px 0 0;font-size:14px;font-weight:700;border-top:1px solid #e8e8e8;">TOTAL</td>
              <td style="padding:12px 0 0;text-align:right;border-top:1px solid #e8e8e8;">
                <div style="font-size:16px;font-weight:700;">${formatUsd(order.total)}</div>
                <div style="font-size:12px;color:#666;margin-top:2px;">${formatLbp(order.total, rate)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 24px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;">
            <tr>
              <td style="padding:16px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Payment method</td>
              <td style="padding:16px 0;text-align:right;font-size:13px;">Cash on Delivery</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 24px 24px;">
          <div style="border:1px solid #e8e8e8;padding:20px;text-align:center;">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Need to make any changes?</div>
            <div style="margin:10px 0 16px;font-size:13px;color:#666;line-height:1.4;">
              If you need to do so, click on the button to manage your order.
            </div>
            <a href="${esc(manageUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 28px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Manage order</a>
          </div>
        </td></tr>

        <tr><td style="padding:0 24px 28px;">
          <div style="border:1px solid #e8e8e8;padding:24px;text-align:center;">
            <a href="${esc(manageUrl)}" style="text-decoration:none;color:#111;">
              <img src="${esc(qrSrc)}" alt="Track order QR code" width="160" height="160" style="display:block;margin:0 auto;border:0;" />
            </a>
            <div style="margin-top:12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Scan to track your order</div>
            <div style="margin:8px 0 12px;font-size:12px;color:#666;line-height:1.4;">
              Open this QR code with your phone camera to view order status and details.
            </div>
            <a href="${esc(manageUrl)}" style="font-size:12px;color:#111;font-weight:700;">Track order online</a>
            <div style="margin-top:12px;font-size:11px;color:#999;">Reference ${esc(ref)}</div>
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#888;line-height:1.5;text-align:center;">
            Your e-ticket PDF is attached to this email.
            <br/><a href="${esc(storeUrl)}" style="color:#111;">Visit SCOSHA</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { orderConfirmationEmail };
