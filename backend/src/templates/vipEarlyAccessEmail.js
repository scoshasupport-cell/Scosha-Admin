function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function vipEarlyAccessEmail({ name, productName, productUrl, shopUrl }) {
  const first = esc((name || 'there').split(' ')[0]);
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1a1a1a;line-height:1.5">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#7A1F2B;font-weight:bold">VIP early access</p>
    <h1 style="font-size:22px">Hi ${first}, a new drop is ready for you</h1>
    <p><strong>${esc(productName)}</strong> is available to Scosha VIP members before it appears for everyone else.</p>
    <p><a href="${esc(productUrl)}" style="display:inline-block;background:#7A1F2B;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px">View product</a></p>
    <p style="color:#666;font-size:13px"><a href="${esc(shopUrl)}">Shop Scosha</a></p>
  </div>
</body></html>`;
}

module.exports = { vipEarlyAccessEmail };
