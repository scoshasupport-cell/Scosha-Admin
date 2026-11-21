function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function vipUnlockedEmail({
  name,
  wasVip,
  discountPercent,
  freeDeliveryCredits,
  creditsAdded,
  orderNumber,
  threshold,
  shopUrl,
}) {
  const first = esc((name || 'there').split(' ')[0]);
  const headline = wasVip ? 'More VIP rewards added' : 'You are now a Scosha VIP';
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1a1a;line-height:1.5">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <h1 style="font-size:22px;color:#7A1F2B">${headline}</h1>
    <p>Hi ${first},</p>
    <p>Your order <strong>${esc(orderNumber)}</strong> was $${esc(threshold)}+ — here is what was added to your account automatically:</p>
    <ul>
      <li><strong>${esc(discountPercent)}% off</strong> your next order (applied automatically at checkout)</li>
      <li><strong>${esc(creditsAdded)} free standard deliveries</strong> (you now have ${esc(freeDeliveryCredits)} remaining)</li>
      <li><strong>VIP status</strong> — early access to new collections before they go live on the site</li>
    </ul>
    <p><a href="${esc(shopUrl)}" style="display:inline-block;background:#7A1F2B;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px">Continue shopping</a></p>
    <p style="color:#666;font-size:13px">Orders of $150+ already include free standard delivery. VIP free-delivery credits cover orders under $150 as well.</p>
  </div>
</body></html>`;
}

module.exports = { vipUnlockedEmail };
