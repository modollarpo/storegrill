import { prisma } from '../index.js';
import { computeCouponDiscount } from './coupon-discount.js';

export interface CouponValidationResult {
  ok: true;
  coupon: {
    code: string;
    dealName: string;
    dealType: string;
    discountMinorUnits: number;
    couponId: string;
  };
}

export interface CouponValidationError {
  ok: false;
  status: number;
  code: string;
  message: string;
}

/**
 * Validates a coupon code and returns the discount in the order's currency.
 * Used by both the cart "preview" endpoint (apply-coupon) and the real order
 * checkout flow, so a coupon can never be accepted client-side and then
 * silently ignored when the actual charge is computed server-side.
 */
export async function validateCoupon(
  code: string,
  subtotalMinorUnits: number,
  orderCurrencyCode = 'USD',
): Promise<CouponValidationResult | CouponValidationError> {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: { deal: true },
  });

  if (!coupon || !coupon.enabled) {
    return { ok: false, status: 404, code: 'INVALID_COUPON', message: 'Invalid or expired coupon code' };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, status: 400, code: 'COUPON_EXPIRED', message: 'Coupon has expired' };
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, status: 400, code: 'COUPON_EXHAUSTED', message: 'Coupon has been fully used' };
  }
  if (!coupon.deal.enabled || coupon.deal.startsAt > new Date() || coupon.deal.endsAt < new Date()) {
    return { ok: false, status: 400, code: 'DEAL_INACTIVE', message: 'Deal is not currently active' };
  }
  if (coupon.deal.minOrderAmount && subtotalMinorUnits < Number(coupon.deal.minOrderAmount)) {
    return { ok: false, status: 400, code: 'MIN_ORDER_NOT_MET', message: 'Minimum order amount not met' };
  }

  const couponCurrencyCode = coupon.currencyCode || orderCurrencyCode;
  const discount = computeCouponDiscount({
    dealType: coupon.deal.type,
    dealValue: Number(coupon.deal.value),
    maxDiscount: coupon.deal.maxDiscount,
    couponCurrencyCode,
    orderCurrencyCode,
    subtotalMinorUnits,
  });

  return {
    ok: true,
    coupon: {
      code: coupon.code,
      dealName: coupon.deal.name,
      dealType: coupon.deal.type,
      discountMinorUnits: discount,
      couponId: coupon.id,
    },
  };
}
