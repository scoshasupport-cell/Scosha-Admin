/**
 * Parse messy catalog price strings into numeric low/high (assumed EUR unless marked otherwise).
 * Examples: "24-45 $", "$12-15", "17-20$", "45", "45.0", "€19,99", "19.99 EUR"
 */
function parsePriceRange(raw) {
  if (raw == null || raw === '') {
    return { low: null, high: null, currencyHint: null, raw: '' };
  }

  const text = String(raw).trim();
  const lower = text.toLowerCase();

  let currencyHint = null;
  if (/€|eur\b|euro/.test(lower)) currencyHint = 'EUR';
  else if (/\$|usd\b/.test(lower)) currencyHint = 'USD';

  const normalized = text
    .replace(/,/g, '.')
    .replace(/[^\d.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const nums = [...normalized.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const valid = nums.filter((n) => Number.isFinite(n) && n > 0);

  if (!valid.length) {
    return { low: null, high: null, currencyHint, raw: text };
  }

  const low = Math.min(...valid);
  const high = Math.max(...valid);
  return { low, high, currencyHint, raw: text };
}

/**
 * Convert a parsed price range to USD sell + optional compare-at.
 * EU marketplace sources without an explicit currency are treated as EUR.
 */
function toUsdPricing(parsed, eurUsdRate, { assumeEur = true } = {}) {
  if (parsed.low == null) {
    return { price: 0, compareAt: null, sourceCurrency: null };
  }

  const isUsd = parsed.currencyHint === 'USD';
  const isEur = parsed.currencyHint === 'EUR' || (!parsed.currencyHint && assumeEur);

  const convert = (n) => {
    if (isUsd) return Math.round(n * 100) / 100;
    if (isEur) return Math.round(n * eurUsdRate * 100) / 100;
    return Math.round(n * 100) / 100;
  };

  const lowUsd = convert(parsed.low);
  const highUsd = convert(parsed.high ?? parsed.low);

  // Midpoint as sell price; high as compare-at when range exists
  const mid = Math.round(((lowUsd + highUsd) / 2) * 100) / 100;
  const compareAt = highUsd > mid ? highUsd : null;

  return {
    price: mid,
    compareAt,
    lowUsd,
    highUsd,
    sourceCurrency: isUsd ? 'USD' : isEur ? 'EUR' : 'UNKNOWN',
  };
}

module.exports = {
  parsePriceRange,
  toUsdPricing,
};
