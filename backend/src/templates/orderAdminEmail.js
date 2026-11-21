const {
  formatUsd,
  formatLbp,
  formatOrderDateParts,
  orderReference,
  resolveUsdToLbp,
} = require('../utils/orderMoney');

function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function orderAdminEmail(order, settings = {}) {
  const rate = resolveUsdToLbp(settings);
  const { date, time } = formatOrderDateParts(order.createdAt);
  const ref = orderReference(order);
  const addr = order.shippingAddress || {};

  const itemsRows = (order.items || [])
    .map((item) => {
      const unit = Number(item.unitPrice || item.price || 0);
      return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${esc(item.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;"><strong>${esc(item.size || '—')}</strong> / ${esc(item.color || '—')}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${esc(item.sku || ref)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${esc(item.quantity)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatUsd(unit)}<br/><span style="color:#888;font-size:11px;">${formatLbp(unit, rate)}</span></td>
      </tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Order ${esc(order.orderNumber)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="640" style="background:#fff;border-radius:12px;padding:32px;">
        <tr><td>
          <h1 style="margin:0 0 8px;font-size:22px;">New COD Order</h1>
          <p style="color:#666;margin:0 0 16px;">
            Reference <strong>${esc(ref)}</strong><br/>
            Date ${esc(date)} · Time ${esc(time)}
          </p>

          <h3 style="margin:0 0 8px;">Customer</h3>
          <p style="margin:0 0 16px;color:#444;line-height:1.6;">
            Name: ${esc(addr.name || order.customerName || '-')}<br/>
            Email: ${esc(addr.email || order.customerEmail || '-')}<br/>
            Phone: ${esc(addr.phone || order.customerPhone || '-')}
          </p>

          <h3 style="margin:0 0 8px;">Shipping Address</h3>
          <p style="margin:0 0 16px;color:#444;line-height:1.6;">
            ${esc(addr.line1 || '')}${addr.line2 ? `, ${esc(addr.line2)}` : ''}<br/>
            ${esc(addr.city || '')}, ${esc(addr.state || '')} ${esc(addr.zip || '')}<br/>
            ${esc(addr.country || '')}
          </p>

          <h3 style="margin:0 0 8px;">Items</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th align="left" style="padding:8px;">Product</th>
                <th align="left" style="padding:8px;">Selected size / Color</th>
                <th align="left" style="padding:8px;">Reference</th>
                <th style="padding:8px;">Qty</th>
                <th align="right" style="padding:8px;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>

          <p style="margin:20px 0 0;line-height:1.8;color:#333;">
            Delivery: <strong>${esc(order.deliveryMethod)}</strong><br/>
            Subtotal: ${formatUsd(order.subtotal)} (${formatLbp(order.subtotal, rate)})<br/>
            Shipping: ${formatUsd(order.shippingCharge)} (${formatLbp(order.shippingCharge, rate)})<br/>
            Tax: ${formatUsd(order.tax)}<br/>
            Discount: ${formatUsd(order.couponDiscount)}<br/>
            <strong>Total: ${formatUsd(order.total)} · ${formatLbp(order.total, rate)}</strong><br/>
            Payment: COD<br/>
            Notes: ${esc(order.notes || '-')}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { orderAdminEmail };
