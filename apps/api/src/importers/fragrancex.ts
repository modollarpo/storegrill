import { createMoney, roundUpTo99 } from '@storegrill/shared';
import {
  cleanSourceUrl,
  httpsify,
  parsePriceToMinor,
  splitByStock,
  type AdaptResult,
  type AdapterRowError,
  type NormalizedProduct,
  type NormalizedVariant,
} from './costway.js';

export const FRAGRANCEX_FEED_PATH = '/frgxdatafeed/outgoingfeed_new.csv';

export const FX_MARKUP_DEFAULT = 1.7;
export const FX_MSRP_STREET_FACTOR = 0.6;
export const FX_MARGIN_FLOOR = 1.25;
export const FX_MSRP_CEILING = 2.2;
export const FX_DEAL_DISCOUNT_RATE = 0.15;
export const FX_DEAL_MIN_RATIO = FX_MARGIN_FLOOR / (1 - FX_DEAL_DISCOUNT_RATE);
export const FX_DEAL_TAG = 'deal';

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

export function computeFxRetailBase(wholesaleMinor: number, msrpMinor: number | null): number {
  if (msrpMinor != null && msrpMinor > 0) {
    const candidate = Math.round(msrpMinor * FX_MSRP_STREET_FACTOR);
    const floor = Math.round(wholesaleMinor * FX_MARGIN_FLOOR);
    const ceiling = Math.round(wholesaleMinor * FX_MSRP_CEILING);
    return Math.min(Math.max(candidate, floor), ceiling);
  }
  return Math.round(wholesaleMinor * FX_MARKUP_DEFAULT);
}

function charm99(minorUnits: number): number {
  return Number(roundUpTo99(createMoney(BigInt(minorUnits), 'USD')).amountMinorUnits);
}

export function applyFragranceXPricing(wholesaleMinor: number, msrpMinor: number | null): number {
  return charm99(computeFxRetailBase(wholesaleMinor, msrpMinor));
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
  const baseRetailMinor = computeFxRetailBase(wholesaleMinor, msrpMinor);
  return {
    sku: row.ITEM.trim(),
    name: row.TITLE?.trim() || `${row.NAME} ${row.TYPE ?? ''}`.trim(),
    variantSuffix: suffix,
    feedPriceMinorUnits: wholesaleMinor,
    priceMinorUnits: charm99(baseRetailMinor),
    listPriceMinorUnits: charm99(baseRetailMinor),
    supplierStock,
    stock: supplierStock,
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

    const minRatio = Math.min(
      ...entries.map(e =>
        computeFxRetailBase(
          parsePriceToMinor(e.entry.row.Wholesale_USD)!,
          parsePriceToMinor(e.entry.row.MSRP),
        ) / parsePriceToMinor(e.entry.row.Wholesale_USD)!,
      ),
    );
    const dealEligible = minRatio >= FX_DEAL_MIN_RATIO;
    if (dealEligible) {
      for (const e of entries) {
        const base = computeFxRetailBase(
          parsePriceToMinor(e.entry.row.Wholesale_USD)!,
          parsePriceToMinor(e.entry.row.MSRP),
        );
        e.variant.priceMinorUnits = charm99(Math.round(base * (1 - FX_DEAL_DISCOUNT_RATE)));
      }
    }

    const first = bucket[0].row;
    products.push({
      groupKey,
      baseName: groupKey,
      description: (first.DESCRIPTION ?? '').trim(),
      specification: (first.TYPE ?? '').trim(),
      categoryPath: ['Fragrances', displayGender(first.GENDER)],
      tags: dealEligible ? [...deriveTags(first), FX_DEAL_TAG] : deriveTags(first),
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
