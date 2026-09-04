import { getCurrencyDecimals, convertMoney, createMoney } from '@Storegrill/shared';

export type DealTypeEnum =
  | 'PERCENTAGE_OFF'
  | 'FIXED_AMOUNT'
  | 'FREE_SHIPPING'
  | 'BOGO'
  | 'BUNDLE'
  | 'FLASH_SALE';

export interface CartItem {
  productId: string;
  categoryId?: string | null;
  quantity: number;
  unitMinorUnits: number;
  currencyCode: string;
}

export interface DealMetadata {
  buyQty?: number;
  getQty?: number;
  discountPercent?: number;
  bundleProductIds?: string[];
  flashProductIds?: string[];
}

export interface DealInput {
  id: string;
  name: string;
  type: DealTypeEnum;
  value: number;
  categoryIds?: string[];
  metadata?: DealMetadata | null;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
}

export interface AppliedDeal {
  dealId: string;
  dealName: string;
  dealType: string;
  discountMinorUnits: number;
  freeShipping: boolean;
  appliedItems: { productId: string; discountMinorUnits: number }[];
}

export interface DealEvaluationResult {
  applied: AppliedDeal[];
  totalDiscountMinorUnits: number;
  freeShipping: boolean;
}

function toOrderMinorUnits(item: CartItem, orderCurrency: string): number {
  if (item.currencyCode === orderCurrency) return item.unitMinorUnits;
  return Number(
    convertMoney(createMoney(BigInt(item.unitMinorUnits), item.currencyCode), orderCurrency).amountMinorUnits,
  );
}

function matchedItems(deal: DealInput, items: CartItem[]): CartItem[] {
  const ids =
    deal.type === 'FLASH_SALE'
      ? deal.metadata?.flashProductIds
      : deal.type === 'BUNDLE'
        ? deal.metadata?.bundleProductIds
        : undefined;

  if (ids && ids.length > 0) {
    const set = new Set(ids);
    return items.filter(i => set.has(i.productId));
  }
  const cats = deal.categoryIds ?? [];
  if (cats.length === 0) return items;
  const catSet = new Set(cats);
  return items.filter(i => i.categoryId && catSet.has(i.categoryId));
}

function lineTotal(item: CartItem, orderCurrency: string): number {
  return toOrderMinorUnits(item, orderCurrency) * item.quantity;
}

/**
 * Pure, IO-free evaluation of active deals against a cart. Supports order-level
 * (PERCENTAGE_OFF / FIXED_AMOUNT / FLASH_SALE / FREE_SHIPPING) and item-level
 * (BOGO / BUNDLE) mechanics. All returned amounts are in `orderCurrency` minor units.
 */
export function evaluateDeals(params: {
  items: CartItem[];
  deals: DealInput[];
  orderCurrency: string;
}): DealEvaluationResult {
  const { items, deals, orderCurrency } = params;
  const applied: AppliedDeal[] = [];
  let freeShipping = false;

  const overallSubtotal = items.reduce((sum, i) => sum + lineTotal(i, orderCurrency), 0);

  for (const deal of deals) {
    const matched = matchedItems(deal, items);
    if (matched.length === 0) continue;

    const matchedSubtotal = matched.reduce((sum, i) => sum + lineTotal(i, orderCurrency), 0);
    if (deal.minOrderAmount != null && overallSubtotal < Number(deal.minOrderAmount)) continue;

    let discount = 0;
    const appliedItems: { productId: string; discountMinorUnits: number }[] = [];

    if (deal.type === 'FREE_SHIPPING') {
      freeShipping = true;
      applied.push({ dealId: deal.id, dealName: deal.name, dealType: deal.type, discountMinorUnits: 0, freeShipping: true, appliedItems: [] });
      continue;
    }

    if (deal.type === 'PERCENTAGE_OFF' || deal.type === 'FLASH_SALE') {
      discount = Math.round((matchedSubtotal * deal.value) / 100);
    } else if (deal.type === 'FIXED_AMOUNT') {
      const decimals = getCurrencyDecimals(orderCurrency);
      discount = Math.round(deal.value * 10 ** decimals);
    } else if (deal.type === 'BOGO') {
      const buyQty = deal.metadata?.buyQty ?? 1;
      const getQty = deal.metadata?.getQty ?? 1;
      const pct = deal.metadata?.discountPercent ?? 100;
      const units: { productId: string; price: number }[] = [];
      for (const item of matched) {
        const price = toOrderMinorUnits(item, orderCurrency);
        for (let q = 0; q < item.quantity; q++) units.push({ productId: item.productId, price });
      }
      units.sort((a, b) => a.price - b.price);
      const groupSize = buyQty + getQty;
      const perProduct: Record<string, number> = {};
      for (let i = 0; i < units.length; i++) {
        const positionInGroup = i % groupSize;
        if (positionInGroup < getQty) {
          const d = Math.round((units[i].price * pct) / 100);
          discount += d;
          perProduct[units[i].productId] = (perProduct[units[i].productId] ?? 0) + d;
        }
      }
      for (const [productId, d] of Object.entries(perProduct)) {
        appliedItems.push({ productId, discountMinorUnits: d });
      }
    } else if (deal.type === 'BUNDLE') {
      const bundleIds = deal.metadata?.bundleProductIds;
      const satisfied = bundleIds && bundleIds.length > 0
        ? bundleIds.every(id => items.some(i => i.productId === id))
        : (deal.categoryIds ?? []).every(cat => items.some(i => i.categoryId === cat));
      if (!satisfied) continue;
      discount = Math.round((matchedSubtotal * deal.value) / 100);
    }

    if (deal.maxDiscount != null) discount = Math.min(discount, Number(deal.maxDiscount));
    discount = Math.min(discount, matchedSubtotal);
    if (discount <= 0) continue;

    if (appliedItems.length === 0) {
      for (const item of matched) appliedItems.push({ productId: item.productId, discountMinorUnits: 0 });
    }

    applied.push({ dealId: deal.id, dealName: deal.name, dealType: deal.type, discountMinorUnits: discount, freeShipping: false, appliedItems });
  }

  const totalDiscountMinorUnits = Math.min(
    applied.reduce((sum, d) => sum + d.discountMinorUnits, 0),
    overallSubtotal,
  );

  return { applied, totalDiscountMinorUnits, freeShipping };
}
