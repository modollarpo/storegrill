export function compareAtPriceOf(product: any): number | undefined {
  const attributes = Array.isArray(product.variants)
    ? product.variants.flatMap((v: any) => {
        try {
          return typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes;
        } catch {
          return [];
        }
      })
    : [];
  for (const attr of attributes) {
    if (attr && String(attr.name).toLowerCase() === 'compare at price') {
      const value = Number(attr.value);
      if (Number.isFinite(value) && value > Number(product.basePriceMinorUnits)) return value;
    }
  }
  return undefined;
}

export function resolveProductPricing(
  product: any,
  regionKey: string,
  activeDeals: any[] = [],
): {
  price: number;
  listPriceMinorUnits?: number;
  currencyCode: string;
  discountPercent?: number;
  dealId?: string | null;
  dealType?: string | null;
} {
  const regional =
    (Array.isArray(product?.regionPrices) && product.regionPrices.find((rp: any) => rp.regionKey === regionKey)) ||
    product?.regionPrices?.[0];
  const basePrice = regional ? Number(regional.priceMinorUnits) : Number(product?.basePriceMinorUnits ?? 0);
  const currencyCode = regional?.currencyCode || product?.currencyCode || 'GBP';

  let listPrice = compareAtPriceOf(product);
  let effectivePrice = basePrice;
  let matchedDealId: string | null | undefined;
  let matchedDealType: string | null | undefined;

  for (const deal of activeDeals) {
    if (deal.vendorId != null && product?.vendorId != null && deal.vendorId !== product.vendorId) continue;

    const flashProductIds = Array.isArray(deal.metadata?.flashProductIds) ? deal.metadata.flashProductIds : [];
    const dealVariants = Array.isArray(deal.variants) ? deal.variants : [];
    const categoryIds = Array.isArray(deal.categoryIds) ? deal.categoryIds : [];

    const flashMatch = flashProductIds.includes(product?.id) || dealVariants.some((dv: any) => dv.productId === product?.id);
    const categoryMatch =
      product?.categoryId != null &&
      categoryIds.length > 0 &&
      categoryIds.includes(product.categoryId);
    if (!flashMatch && !categoryMatch) continue;

    if (deal.value != null) {
      const dealVal = Number(deal.value);
      if (deal.type === 'PERCENTAGE_OFF' || deal.type === 'FLASH_SALE') {
        const discounted = Math.max(0, Math.round((basePrice * (100 - dealVal)) / 100));
        if (discounted < effectivePrice) {
          listPrice = Math.max(listPrice ?? basePrice, basePrice);
          effectivePrice = discounted;
          matchedDealId = deal.id;
          matchedDealType = deal.type;
        }
      } else if (deal.type === 'FIXED_AMOUNT') {
        const off = Math.round(dealVal * 100);
        const discounted = Math.max(0, basePrice - off);
        if (discounted < effectivePrice) {
          listPrice = Math.max(listPrice ?? basePrice, basePrice);
          effectivePrice = discounted;
          matchedDealId = deal.id;
          matchedDealType = deal.type;
        }
      }
    }
  }

  if (listPrice !== undefined && listPrice > effectivePrice) {
    const discountPercent = Math.round(((listPrice - effectivePrice) / listPrice) * 100);
    return {
      price: effectivePrice,
      listPriceMinorUnits: listPrice,
      currencyCode,
      ...(discountPercent >= 1 ? { discountPercent, dealId: matchedDealId ?? null, dealType: matchedDealType ?? null } : {}),
    };
  }

  return { price: effectivePrice, currencyCode, dealId: null, dealType: null };
}
