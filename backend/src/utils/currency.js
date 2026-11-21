const DEFAULT_EUR_USD = 1.1551;

/**
 * Fetch the latest EUR→USD rate (Frankfurter / ECB). Falls back to a recent known rate.
 */
async function fetchEurUsdRate({ timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);
    const data = await res.json();
    const rate = Number(data?.rates?.USD);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid EUR/USD rate');
    return { rate, date: data.date || null, source: 'frankfurter' };
  } catch (primaryError) {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`ER-API HTTP ${res.status}`);
      const data = await res.json();
      const rate = Number(data?.rates?.USD);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid EUR/USD rate');
      return { rate, date: data.time_last_update_utc || null, source: 'open.er-api' };
    } catch {
      return {
        rate: Number(process.env.EUR_USD_RATE) || DEFAULT_EUR_USD,
        date: null,
        source: 'fallback',
        warning: primaryError.message,
      };
    }
  } finally {
    clearTimeout(timer);
  }
}

function eurToUsd(amountEur, rate) {
  const n = Number(amountEur);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * rate * 100) / 100;
}

module.exports = {
  DEFAULT_EUR_USD,
  fetchEurUsdRate,
  eurToUsd,
};
