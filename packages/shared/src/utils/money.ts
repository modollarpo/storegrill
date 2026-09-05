export interface Money {
  amountMinorUnits: bigint;
  currencyCode: string;
}

export function createMoney(amountMinorUnits: bigint, currencyCode: string): Money {
  return { amountMinorUnits, currencyCode };
}

export function moneyFromDecimal(amount: number, currencyCode: string, decimals: number = 2): Money {
  const multiplier = 10 ** decimals;
  const minorUnits = BigInt(Math.round(amount * multiplier));
  return { amountMinorUnits: minorUnits, currencyCode };
}

export function moneyToDecimal(money: Money, decimals: number = 2): number {
  const divisor = 10 ** decimals;
  return Number(money.amountMinorUnits) / divisor;
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`);
  }
  return {
    amountMinorUnits: a.amountMinorUnits + b.amountMinorUnits,
    currencyCode: a.currencyCode,
  };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`);
  }
  return {
    amountMinorUnits: a.amountMinorUnits - b.amountMinorUnits,
    currencyCode: a.currencyCode,
  };
}

export function multiplyMoney(money: Money, factor: number): Money {
  return {
    amountMinorUnits: BigInt(Math.round(Number(money.amountMinorUnits) * factor)),
    currencyCode: money.currencyCode,
  };
}

export function minMoney(a: Money, b: Money): Money {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`);
  }
  return a.amountMinorUnits <= b.amountMinorUnits ? a : b;
}

export function maxMoney(a: Money, b: Money): Money {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`);
  }
  return a.amountMinorUnits >= b.amountMinorUnits ? a : b;
}

export function isZero(money: Money): boolean {
  return money.amountMinorUnits === 0n;
}

export function isPositive(money: Money): boolean {
  return money.amountMinorUnits > 0n;
}

export function isNegative(money: Money): boolean {
  return money.amountMinorUnits < 0n;
}

export function applyPercentageMarkup(money: Money, rate: number): Money {
  const markedUp = Number(money.amountMinorUnits) * (1 + rate);
  return {
    amountMinorUnits: BigInt(Math.round(markedUp)),
    currencyCode: money.currencyCode,
  };
}

export function roundUpTo99(money: Money): Money {
  if (getCurrencyDecimals(money.currencyCode) === 0) {
    return money;
  }
  const minor = Number(money.amountMinorUnits);
  const major = Math.floor(minor / 100);
  const minorPart = minor % 100;
  const charmed = minorPart === 99 ? minor : major * 100 + 99;
  return {
    amountMinorUnits: BigInt(charmed),
    currencyCode: money.currencyCode,
  };
}

export interface MoneyLike {
  amountMinorUnits: bigint;
  currencyCode: string;
}

export function asMoney(value: Money | MoneyLike): Money {
  return { amountMinorUnits: value.amountMinorUnits, currencyCode: value.currencyCode };
}

/**
 * Percentage of an integer minor-unit amount as whole minor units.
 * `basisPoints` is 10000 = 100%. Rounding is half-up on the integer result.
 */
export function percentOf(amountMinorUnits: bigint, basisPoints: number | bigint): bigint {
  const bps = typeof basisPoints === 'bigint' ? basisPoints : BigInt(Math.round(basisPoints));
  const numerator = amountMinorUnits * bps;
  const divisor = 10000n;
  const remainder = numerator % divisor;
  const half = divisor / 2n;
  const rounded = numerator / divisor + (remainder >= half ? 1n : 0n);
  return rounded;
}

/** Converts a percentage (e.g. 12.5 for 12.5%) to basis points. */
export function toBasisPoints(pct: number): number {
  return Math.round(pct * 100);
}

/** Converts basis points (10000 = 100%) to a percentage. */
export function basisPointsToPercent(bps: number | bigint): number {
  const n = typeof bps === 'bigint' ? bps : BigInt(Math.round(bps));
  return Number(n) / 100;
}

export function clampMoney(money: Money, minMinorUnits: bigint, maxMinorUnits: bigint): Money {
  return {
    amountMinorUnits: money.amountMinorUnits < minMinorUnits
      ? minMinorUnits
      : money.amountMinorUnits > maxMinorUnits
        ? maxMinorUnits
        : money.amountMinorUnits,
    currencyCode: money.currencyCode,
  };
}

export function formatMoney(money: Money): string {
  const decimals = getCurrencyDecimals(money.currencyCode);
  const amount = moneyToDecimal(money, decimals);
  return new Intl.NumberFormat(getLocaleForCurrency(money.currencyCode), {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function getCurrencyDecimals(currencyCode: string): number {
  const zeroDecimalCurrencies = new Set([
    'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'KMF', 'KRW', 'KZT',
    'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
    'JPY',
  ]);
  return zeroDecimalCurrencies.has(currencyCode) ? 0 : 2;
}

const NATIVE_ENGLISH_LOCALES: Record<string, string> = {
  USD: 'en-US',
  GBP: 'en-GB',
  EUR: 'en-IE',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

function getLocaleForCurrency(currencyCode: string): string {
  return NATIVE_ENGLISH_LOCALES[currencyCode] ?? 'en-GB';
}
