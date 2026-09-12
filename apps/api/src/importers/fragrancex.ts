import {
  cleanSourceUrl,
  httpsify,
  OUT_OF_STOCK_THRESHOLD,
  parsePriceToMinor,
  splitByStock,
  type AdaptResult,
  type AdapterRowError,
  type NormalizedProduct,
  type NormalizedVariant,
} from './costway.js';

export const FRAGRANCEX_FEED_PATH = '/frgxdatafeed/outgoingfeed_new.csv';

export interface FragranceXFeedRow {
  ITEM: string;
  NAME: string;
  DESCRIPTION: string;
  BRAND: string;
  TYPE: string;
  TITLE: string;
  Size: string;
  Metric_Size: string;
  GENDER: string;
  MSRP: string;
  Wholesale_USD: string;
  IMAGE: string;
  URL: string;
  QTY: string;
}

export function applyFragranceXPricing(wholesaleMinor: number, msrpMinor: number | null): number {
  if (msrpMinor != null && msrpMinor > 0) return msrpMinor;
  return wholesaleMinor;
}

function normalizeGender(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === 'men' || value === 'women') return value;
  return 'unisex';
}

function displayGender(raw: string): string {
  const value = normalizeGender(raw);
  return value === 'men' ? 'Men' : value === 'women' ? 'Women' : 'Unisex';
}

const TAG_RULES: Array<[RegExp, string]> = [
  [/tester/i, 'tester'],
  [/gift set/i, 'gift-set'],
  [/\bmini\b/i, 'mini'],
  [/refill/i, 'refill'],
];

function deriveTags(row: FragranceXFeedRow): string[] {
  const tags = ['fragrancex', normalizeGender(row.GENDER)];
  for (const [pattern, tag] of TAG_RULES) {
    if (pattern.test(row.TYPE)) tags.push(tag);
  }
  return tags;
}

function toVariant(row: FragranceXFeedRow): NormalizedVariant | null {
  const wholesaleMinor = parsePriceToMinor(row.Wholesale_USD);
  if (wholesaleMinor == null || wholesaleMinor <= 0) return null;
  const msrpMinor = parsePriceToMinor(row.MSRP);
  const supplierStock = Math.max(0, Number.parseInt(row.QTY, 10) || 0);
  const suffix = row.TYPE?.trim() && row.TYPE.trim() !== row.NAME.trim() ? row.TYPE.trim() : null;
  return {
    sku: row.ITEM.trim(),
    name: row.TITLE?.trim() || `${row.NAME} ${row.TYPE ?? ''}`.trim(),
    variantSuffix: suffix,
    feedPriceMinorUnits: wholesaleMinor,
    priceMinorUnits: applyFragranceXPricing(wholesaleMinor, msrpMinor),
    supplierStock,
    stock: supplierStock >= OUT_OF_STOCK_THRESHOLD ? supplierStock : 0,
    images: row.IMAGE?.trim() ? [httpsify(row.IMAGE)] : [],
  };
}

export function adaptFragranceXRows(rows: FragranceXFeedRow[]): AdaptResult {
  const errors: AdapterRowError[] = [];
  const valid: Array<{ row: FragranceXFeedRow; rowNumber: number }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.ITEM?.trim()) {
      errors.push({ rowNumber, field: 'ITEM', message: 'ITEM SKU is required' });
      return;
    }
    if (!row.NAME?.trim()) {
      errors.push({ rowNumber, field: 'NAME', message: 'NAME is required' });
      return;
    }
    const wholesale = parsePriceToMinor(row.Wholesale_USD);
    if (wholesale == null || wholesale <= 0) {
      errors.push({ rowNumber, field: 'Wholesale_USD', message: `Invalid wholesale price "${row.Wholesale_USD}"` });
      return;
    }
    valid.push({ row, rowNumber });
  });

  const groups = new Map<string, Array<{ row: FragranceXFeedRow; rowNumber: number }>>();
  for (const entry of valid) {
    const groupKey = entry.row.NAME.trim();
    const bucket = groups.get(groupKey) ?? [];
    bucket.push(entry);
    groups.set(groupKey, bucket);
  }

  const products: NormalizedProduct[] = [];

  for (const [groupKey, bucket] of groups) {
    const entries = bucket
      .map(entry => ({ entry, variant: toVariant(entry.row) }))
      .filter((e): e is { entry: { row: FragranceXFeedRow; rowNumber: number }; variant: NormalizedVariant } => e.variant !== null);
    if (entries.length === 0) {
      errors.push({ rowNumber: bucket[0].rowNumber, field: 'Wholesale_USD', message: 'No valid variant in group' });
      continue;
    }
    const variants = entries.map(e => e.variant);

    const first = bucket[0].row;
    products.push({
      groupKey,
      baseName: groupKey,
      description: (first.DESCRIPTION ?? '').trim(),
      specification: (first.TYPE ?? '').trim(),
      categoryPath: ['Fragrances', displayGender(first.GENDER)],
      tags: deriveTags(first),
      attributes: {
        gender: normalizeGender(first.GENDER),
        ...(first.Size?.trim() && first.Size.trim() !== '--' ? { size: first.Size.trim() } : {}),
        ...(first.Metric_Size?.trim() && first.Metric_Size.trim() !== '--'
          ? { metricSize: first.Metric_Size.trim() }
          : {}),
      },
      sourceUrl: cleanSourceUrl(first.URL ?? ''),
      brandName: first.BRAND?.trim() || 'Unbranded',
      variants,
    });
  }

  const grouped = splitByStock(products);
  return { products: grouped.sellable, outOfStock: grouped.outOfStock, errors };
}

export function isFragranceXHeader(header: string[]): boolean {
  return header.includes('ITEM') && header.includes('Wholesale_USD');
}
