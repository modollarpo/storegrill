import { prisma } from '../index.js';

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
 * Single source of truth for coupon validation and discount calculation.
 * Used by both the cart-page "preview" endpoint (apply-coupon) and the real
 * order checkout flow, so a coupon can never be accepted client-side and
 * then silently ignored when the actual charge is computed server-side.
 */
export async function validateCoupon(
  code: string,
  subtotalMinorUnits: number
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

  let discount = 0;
  if (coupon.deal.type === 'PERCENTAGE_OFF') {
    discount = Math.round((subtotalMinorUnits * Number(coupon.deal.value)) / 100);
    if (coupon.deal.maxDiscount) {
      discount = Math.min(discount, Number(coupon.deal.maxDiscount));
    }
  } else if (coupon.deal.type === 'FIXED_AMOUNT') {
    discount = Number(coupon.deal.value) * 100;
  }
  discount = Math.min(discount, subtotalMinorUnits);

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
