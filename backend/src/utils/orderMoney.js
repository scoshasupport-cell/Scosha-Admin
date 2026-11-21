/**
 * Currency helpers for order emails / e-tickets (USD + Lebanese Lira).
 */

const DEFAULT_USD_TO_LBP = Number(process.env.USD_TO_LBP || 89500);

function resolveUsdToLbp(settings) {
  const fromShipping = Number(settings?.shipping?.usdToLbp);
  if (Number.isFinite(fromShipping) && fromShipping > 0) return fromShipping;
  return DEFAULT_USD_TO_LBP;
}

function formatUsd(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

function formatLbp(n, rate = DEFAULT_USD_TO_LBP) {
  const lbp = Math.round(Number(n || 0) * Number(rate || DEFAULT_USD_TO_LBP));
  return `${lbp.toLocaleString('en-US')} LBP`;
}

function formatOrderDateParts(iso) {
  const d = new Date(iso || Date.now());
  const date = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const time = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { date, time, iso: d.toISOString() };
}

function orderReference(order) {
  return String(order.orderNumber || order.id || '').replace(/^(AMZ|SCO)-/, '');
}

module.exports = {
  DEFAULT_USD_TO_LBP,
  resolveUsdToLbp,
  formatUsd,
  formatLbp,
  formatOrderDateParts,
  orderReference,
};
