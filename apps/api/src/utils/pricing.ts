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
} {
  const regional =
    (Array.isArray(product?.regionPrices) && product.regionPrices.find((rp: any) => rp.regionKey === regionKey)) ||
    product?.regionPrices?.[0];
  const basePrice = regional ? Number(regional.priceMinorUnits) : Number(product?.basePriceMinorUnits ?? 0);
  const currencyCode = regional?.currencyCode || product?.currencyCode || 'GBP';

  let listPrice = compareAtPriceOf(product);
  let effectivePrice = basePrice;

  for (const deal of activeDeals) {
    const isMatched = (deal.variants ?? []).some((dv: any) => dv.productId === product.id);
    if (isMatched && deal.value != null) {
      const dealVal = Number(deal.value);
      if (deal.type === 'PERCENTAGE_OFF' || deal.type === 'FLASH_SALE') {
        const discounted = Math.max(0, Math.round((basePrice * (100 - dealVal)) / 100));
        if (discounted < effectivePrice) {
          listPrice = Math.max(listPrice ?? basePrice, basePrice);
          effectivePrice = discounted;
        }
      } else if (deal.type === 'FIXED_AMOUNT') {
        const off = Math.round(dealVal * 100);
        const discounted = Math.max(0, basePrice - off);
        if (discounted < effectivePrice) {
          listPrice = Math.max(listPrice ?? basePrice, basePrice);
          effectivePrice = discounted;
        }
      }
    }
  }

  if (listPrice !== undefined && listPrice > effectivePrice) {
    return { price: effectivePrice, listPriceMinorUnits: listPrice, currencyCode };
  }

  return { price: effectivePrice, currencyCode };
}
