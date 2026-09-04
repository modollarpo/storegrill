import { prisma } from '../index.js';
import { computeCouponDiscount } from './coupon-discount.js';
import { evaluateDeals, type DealInput } from './deal-engine.js';
import { DealTypeEnum } from '@Storegrill/shared';

export interface ApplyCouponItem {
  productId: string;
  categoryId?: string | null;
  quantity: number;
  unitMinorUnits: number;
  currencyCode: string;
}

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
  items?: ApplyCouponItem[],
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

  const couponCurrencyCode = orderCurrencyCode;
  const dealType = coupon.deal.type as DealTypeEnum;

  let discount: number;
  if ((dealType === 'BOGO' || dealType === 'BUNDLE') && items && items.length > 0) {
    const dealInput: DealInput = {
      id: coupon.deal.id,
      name: coupon.deal.name,
      type: dealType,
      value: Number(coupon.deal.value),
      categoryIds: parseCategoryIds(coupon.deal.categoryIds),
      metadata: (coupon.deal as { metadata?: DealInput['metadata'] }).metadata ?? null,
      minOrderAmount: coupon.deal.minOrderAmount,
      maxDiscount: coupon.deal.maxDiscount,
    };
    discount = evaluateDeals({ items, deals: [dealInput], orderCurrency: orderCurrencyCode }).totalDiscountMinorUnits;
  } else {
    discount = computeCouponDiscount({
    dealType: coupon.deal.type,
    dealValue: Number(coupon.deal.value),
    maxDiscount: coupon.deal.maxDiscount,
    couponCurrencyCode,
    orderCurrencyCode,
    subtotalMinorUnits,
  });
  }

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

function parseCategoryIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}
