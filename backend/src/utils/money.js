/**
 * Money is handled in integer cents so that 0.1 + 0.2 never becomes 0.30000000000000004.
 * MySQL stores DECIMAL(10,2); every value written there must pass through fromCents/round2.
 */

function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  // 1.005 * 100 is 100.49999999999999 in binary floating point; trimming to 12
  // significant digits before rounding gives the decimal answer (100.5 → 101).
  const scaled = Number((n * 100).toPrecision(12));
  const rounded = Math.round(Math.abs(scaled));
  return scaled < 0 ? -rounded : rounded;
}

function fromCents(cents) {
  return Math.round(Number(cents) || 0) / 100;
}

function round2(amount) {
  return fromCents(toCents(amount));
}

/** unitPrice × quantity, exact to the cent. */
function lineTotal(unitPrice, quantity) {
  const qty = Math.max(0, Math.trunc(Number(quantity) || 0));
  return fromCents(toCents(unitPrice) * qty);
}

function sum(...amounts) {
  return fromCents(amounts.reduce((acc, amount) => acc + toCents(amount), 0));
}

function subtract(a, b) {
  return fromCents(toCents(a) - toCents(b));
}

/** percent of amount, rounded half-up to the cent. */
function percentOf(amount, percent) {
  const cents = toCents(amount);
  const pct = Number(percent) || 0;
  return fromCents(Math.round((cents * pct) / 100));
}

/** amount × rate (e.g. tax rate 0.0825), rounded to the cent. */
function applyRate(amount, rate) {
  const cents = toCents(amount);
  const r = Number(rate) || 0;
  return fromCents(Math.round(cents * r));
}

function min(...amounts) {
  return fromCents(Math.min(...amounts.map(toCents)));
}

function max(...amounts) {
  return fromCents(Math.max(...amounts.map(toCents)));
}

module.exports = {
  toCents,
  fromCents,
  round2,
  lineTotal,
  sum,
  subtract,
  percentOf,
  applyRate,
  min,
  max,
};
