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
