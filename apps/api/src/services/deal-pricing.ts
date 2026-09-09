export function resolveListPrice(
  product: any,
  regionKey: string,
): { listPriceMinorUnits: number; currencyCode: string } {
  const regional =
    (Array.isArray(product?.regionPrices) &&
      product.regionPrices.find((rp: any) => rp.regionKey === regionKey)) ||
    product?.regionPrices?.[0];
  const listPriceMinorUnits = regional ? Number(regional.priceMinorUnits) : Number(product?.basePriceMinorUnits);
  const currencyCode = regional?.currencyCode || product?.currencyCode || 'GBP';
  return { listPriceMinorUnits, currencyCode };
}

export function dealPriceFor(
  dealType: string,
  value: number,
  listPriceMinorUnits: number,
): { priceMinorUnits: number; discountPercent: number } | null {
  if (!Number.isFinite(listPriceMinorUnits) || listPriceMinorUnits <= 0) return null;

  let priceMinorUnits: number;
  let discountPercent: number;

  if (dealType === 'PERCENTAGE_OFF' || dealType === 'FLASH_SALE') {
    discountPercent = Math.round(Number(value));
    priceMinorUnits = Math.max(0, Math.round((listPriceMinorUnits * (100 - discountPercent)) / 100));
  } else if (dealType === 'FIXED_AMOUNT') {
    const off = Math.round(Number(value) * 100);
    priceMinorUnits = Math.max(0, listPriceMinorUnits - off);
    if (priceMinorUnits <= 0) return null;
    discountPercent = Math.round(((listPriceMinorUnits - priceMinorUnits) / listPriceMinorUnits) * 100);
  } else {
    return null;
  }

  if (priceMinorUnits <= 0 || discountPercent < 1) return null;
  return { priceMinorUnits, discountPercent };
}