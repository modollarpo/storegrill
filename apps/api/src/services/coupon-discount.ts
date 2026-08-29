import { getCurrencyDecimals, convertMoney, createMoney } from '@Storegrill/shared';

/**
 * Pure, IO-free coupon discount computation — the single source of truth for
 * how a coupon discount is calculated. Keeping this out of the Prisma-backed
 * `coupons.ts` makes it unit-testable without a database.
 *
 * - PERCENTAGE_OFF is currency-independent (a percentage of the subtotal).
 * - FIXED_AMOUNT `value` is treated as MAJOR units in `couponCurrencyCode`
 *   and is converted to `orderCurrencyCode` when they differ.
 * The returned number is always expressed in `orderCurrencyCode` minor units.
 */
export function computeCouponDiscount(params: {
  dealType: string;
  dealValue: number;
  maxDiscount?: number | null;
  couponCurrencyCode: string;
  orderCurrencyCode: string;
  subtotalMinorUnits: number;
}): number {
  const { dealType, dealValue, maxDiscount, couponCurrencyCode, orderCurrencyCode, subtotalMinorUnits } = params;

  let discountMinor: number;
  if (dealType === 'PERCENTAGE_OFF') {
    discountMinor = Math.round((subtotalMinorUnits * dealValue) / 100);
    if (maxDiscount != null) {
      discountMinor = Math.min(discountMinor, Number(maxDiscount));
    }
  } else if (dealType === 'FIXED_AMOUNT') {
    const couponDecimals = getCurrencyDecimals(couponCurrencyCode);
    const discountInCouponCurrency = Math.round(dealValue * 10 ** couponDecimals);
    if (couponCurrencyCode === orderCurrencyCode) {
      discountMinor = discountInCouponCurrency;
    } else {
      const converted = convertMoney(
        createMoney(BigInt(discountInCouponCurrency), couponCurrencyCode),
        orderCurrencyCode,
      );
      discountMinor = Number(converted.amountMinorUnits);
    }
  } else {
    discountMinor = 0;
  }

  return Math.min(discountMinor, subtotalMinorUnits);
}
