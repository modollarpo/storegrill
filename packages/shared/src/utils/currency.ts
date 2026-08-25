import { Money, createMoney, moneyToDecimal, getCurrencyDecimals } from './money';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

const ratesCache = new Map<string, ExchangeRate>();
const CACHE_TTL_MS = 3600000; // 1 hour

const FALLBACK_RATES: Record<string, number> = {
  'USD_EUR': 0.92,
  'USD_GBP': 0.79,
  'USD_INR': 83.12,
  'USD_JPY': 148.50,
  'USD_CAD': 1.36,
  'USD_AUD': 1.53,
  'USD_BRL': 4.97,
  'USD_MXN': 17.15,
  'USD_CNY': 7.24,
  'USD_AED': 3.67,
  'USD_SAR': 3.75,
  'USD_NGN': 1550,
  'USD_ZAR': 18.20,
  'USD_KES': 129,
  'USD_GHS': 15.20,
  'USD_UGX': 3780,
  'USD_EGP': 48.5,
  'USD_MAD': 9.90,
  'USD_TZS': 2650,
  'EUR_USD': 1.087,
  'EUR_GBP': 0.86,
  'EUR_INR': 90.45,
  'GBP_USD': 1.265,
  'GBP_EUR': 1.163,
  'INR_USD': 0.012,
};

export function getExchangeRate(from: string, to: string): number {
  if (from === to) return 1;

  const cacheKey = `${from}_${to}`;
  const cached = ratesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp.getTime() < CACHE_TTL_MS) {
    return cached.rate;
  }

  const directRate = FALLBACK_RATES[cacheKey];
  if (directRate) {
    ratesCache.set(cacheKey, {
      from, to, rate: directRate, timestamp: new Date(),
    });
    return directRate;
  }

  const viaUsdA = FALLBACK_RATES[`${from}_USD`];
  const viaUsdB = FALLBACK_RATES[`USD_${to}`];
  if (viaUsdA && viaUsdB) {
    const rate = viaUsdA * viaUsdB;
    ratesCache.set(cacheKey, {
      from, to, rate, timestamp: new Date(),
    });
    return rate;
  }

  throw new Error(`Exchange rate not available: ${from} -> ${to}`);
}

export function convertMoney(money: Money, toCurrency: string): Money {
  if (money.currencyCode === toCurrency) return money;
  const rate = getExchangeRate(money.currencyCode, toCurrency);
  const decimals = getCurrencyDecimals(toCurrency);
  const multiplier = 10 ** decimals;
  const converted = Number(money.amountMinorUnits) * rate;
  return createMoney(BigInt(Math.round(converted)), toCurrency);
}

export function convertMoneyWithRate(money: Money, toCurrency: string, rate: number): Money {
  if (money.currencyCode === toCurrency) return money;
  const decimals = getCurrencyDecimals(toCurrency);
  const multiplier = 10 ** decimals;
  const converted = Number(money.amountMinorUnits) * rate;
  return createMoney(BigInt(Math.round(converted)), toCurrency);
}
