import { createMoney, roundUpTo99 } from '@Storegrill/shared';

export const COSTWAY_FEED_URL =
  'https://www.costway.co.uk/media/feed/costway_uk_dropship_products.csv';

export const PRICE_MARKUP_RATE = 0.20;
export const FLASH_SALE_DISCOUNT_RATE = 0.15;
export const CLEARANCE_MARKUP_REDUCTION = 0.10;
export const OUT_OF_STOCK_THRESHOLD = 10;

export const HOUSE_BRAND = 'Costway';

export interface CostwayFeedRow {
  SKU: string;
  item_group_id: string;
  'item number': string;
  'Item Name': string;
  Price: string;
  Specification: string;
  Description: string;
  Category: string;
  Stock: string;
  'is it in stock': string;
  'Is it flash-sale': string;
  'Is it clearance': string;
  'Is it best seller': string;
  'Item Link': string;
  'Image URL': string;
  Image2?: string;
  Image3?: string;
  Image4?: string;
  Image5?: string;
  Image6?: string;
  Image7?: string;
  Image8?: string;
  'is it pre-order': string;
}

export interface NormalizedVariant {
  sku: string;
  name: string;
  variantSuffix: string | null;
  feedPriceMinorUnits: number;
  priceMinorUnits: number;
  listPriceMinorUnits?: number;
  supplierStock: number;
  stock: number;
  images: string[];
}

export interface NormalizedProduct {
  groupKey: string | null;
  baseName: string;
  description: string;
  specification: string;
  categoryPath: string[];
  tags: string[];
  attributes: Record<string, string | boolean>;
  sourceUrl: string;
  brandName: string;
  variants: NormalizedVariant[];
}

export interface AdapterRowError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface AdaptResult {
  products: NormalizedProduct[];
  outOfStock: NormalizedProduct[];
  errors: AdapterRowError[];
}

export function splitByStock(products: NormalizedProduct[]): { sellable: NormalizedProduct[]; outOfStock: NormalizedProduct[] } {
  const sellable: NormalizedProduct[] = [];
  const outOfStock: NormalizedProduct[] = [];
  for (const p of products) {
    const total = p.variants.reduce((sum, v) => sum + v.stock, 0);
    (total > OUT_OF_STOCK_THRESHOLD ? sellable : outOfStock).push(p);
  }
  return { sellable, outOfStock };
}

export function parsePriceToMinor(raw: string): number | null {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[£\s]/g, '');
  if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned.replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function mulPenny(minorUnits: number, factor: number): number {
  return Math.round(minorUnits * factor);
}

export interface PricingFlags {
  flashSale?: boolean;
  clearance?: boolean;
}

export function applyIngestPricing(feedPriceMinorUnits: number, flags?: PricingFlags): number {
  let priced: number;
  if (flags?.flashSale) {
    priced = mulPenny(mulPenny(feedPriceMinorUnits, 1 + PRICE_MARKUP_RATE), 1 - FLASH_SALE_DISCOUNT_RATE);
  } else if (flags?.clearance) {
    priced = mulPenny(feedPriceMinorUnits, 1 + PRICE_MARKUP_RATE - CLEARANCE_MARKUP_REDUCTION);
  } else {
    priced = mulPenny(feedPriceMinorUnits, 1 + PRICE_MARKUP_RATE);
  }
  return Number(roundUpTo99(createMoney(BigInt(priced), 'GBP')).amountMinorUnits);
}

export function httpsify(url: string): string {
  return url.trim().replace(/^http:\/\//i, 'https://');
}

export function normalizeImages(row: CostwayFeedRow): string[] {
  const candidates = [
    row['Image URL'],
    row.Image2,
    row.Image3,
    row.Image4,
    row.Image5,
    row.Image6,
    row.Image7,
    row.Image8,
  ];
  const seen = new Set<string>();
  const images: string[] = [];
  for (const candidate of candidates) {
    const url = candidate?.trim();
    if (!url) continue;
    const rewritten = httpsify(url);
    if (seen.has(rewritten)) continue;
    seen.add(rewritten);
    images.push(rewritten);
  }
  return images;
}

export function cleanSourceUrl(url: string): string {
  try {
    const parsed = new URL(httpsify(url));
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith('utm_')) parsed.searchParams.delete(key);
    }
    return parsed.toString();
  } catch {
    return httpsify(url);
  }
}

export function parseCategoryPath(category: string): string[] {
  return category
    .split('>')
    .map(part => part.trim())
    .filter(Boolean);
}

interface DerivedFlags {
  tags: string[];
  attributes: Record<string, string | boolean>;
}

export function parseFlags(row: CostwayFeedRow): DerivedFlags {
  const tags = ['costway'];
  if (row['Is it best seller'] === '1') tags.push('best-seller');
  if (row['Is it clearance'] === '1') tags.push('clearance');
  if (row['Is it flash-sale'] === '1') tags.push('flash-sale');
  const attributes: Record<string, string | boolean> = {};
  if (row['is it pre-order'] === '1') attributes.preorder = true;
  return { tags, attributes };
}

function longestCommonWordPrefix(names: string[]): string {
  if (names.length === 0) return '';
  let prefixWords = names[0].split(/\s+/);
  for (const name of names.slice(1)) {
    const words = name.split(/\s+/);
    let i = 0;
    while (i < prefixWords.length && i < words.length && prefixWords[i] === words[i]) i++;
    prefixWords = prefixWords.slice(0, Math.max(i, 1));
  }
  return prefixWords.join(' ');
}

export function splitBaseNameAndSuffix(names: string[]): { baseName: string; suffixes: Array<string | null> } {
  const common = longestCommonWordPrefix(names);
  const lastJoined = names[0];
  const separatorIndex = common.length < lastJoined.length ? lastJoined.indexOf('-', common.length - 1) : -1;

  if (separatorIndex === -1 || names.some(name => !name.startsWith(common))) {
    return { baseName: common, suffixes: names.map(() => null) };
  }

  const baseName = lastJoined.slice(0, separatorIndex).trim().replace(/[-\s]+$/, '');
  const suffixes = names.map(name => {
    const remainder = name.slice(baseName.length).replace(/^[\s-]+/, '');
    return remainder.length > 0 ? remainder : null;
  });
  return { baseName, suffixes };
}

function toVariant(row: CostwayFeedRow, suffix: string | null, flags: DerivedFlags): NormalizedVariant | null {
  const feedPriceMinorUnits = parsePriceToMinor(row.Price);
  if (feedPriceMinorUnits == null) return null;
  const supplierStock = Number.parseInt(row.Stock, 10) || 0;
  const isFlashSale = flags.tags.includes('flash-sale');
  return {
    sku: row.SKU.trim(),
    name: row['Item Name'].trim(),
    variantSuffix: suffix,
    feedPriceMinorUnits,
    priceMinorUnits: applyIngestPricing(feedPriceMinorUnits, {
      flashSale: isFlashSale,
      clearance: flags.tags.includes('clearance'),
    }),
    ...(isFlashSale ? { listPriceMinorUnits: applyIngestPricing(feedPriceMinorUnits) } : {}),
    supplierStock,
    stock: supplierStock > OUT_OF_STOCK_THRESHOLD ? supplierStock : 0,
    images: normalizeImages(row),
  };
}

function standaloneProduct(row: CostwayFeedRow): NormalizedProduct | null {
  const flags = parseFlags(row);
  const variant = toVariant(row, null, flags);
  if (!variant) return null;
  return {
    groupKey: null,
    baseName: row['Item Name'].trim(),
    description: (row.Description ?? '').trim(),
    specification: (row.Specification ?? '').trim(),
    categoryPath: parseCategoryPath(row.Category ?? ''),
    tags: flags.tags,
    attributes: flags.attributes,
    sourceUrl: cleanSourceUrl(row['Item Link']),
    brandName: HOUSE_BRAND,
    variants: [variant],
  };
}

export function adaptCostwayRows(rows: CostwayFeedRow[]): AdaptResult {
  const errors: AdapterRowError[] = [];
  const valid: Array<{ row: CostwayFeedRow; rowNumber: number }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.SKU?.trim()) {
      errors.push({ rowNumber, field: 'SKU', message: 'SKU is required' });
      return;
    }
    if (!row['Item Name']?.trim()) {
      errors.push({ rowNumber, field: 'Item Name', message: 'Name is required' });
      return;
    }
    if (parsePriceToMinor(row.Price) == null) {
      errors.push({ rowNumber, field: 'Price', message: `Invalid price value "${row.Price}"` });
      return;
    }
    valid.push({ row, rowNumber });
  });

  const groups = new Map<string, Array<{ row: CostwayFeedRow; rowNumber: number }>>();
  for (const entry of valid) {
    const groupId = entry.row.item_group_id?.trim() || entry.row.SKU.trim();
    const bucket = groups.get(groupId) ?? [];
    bucket.push(entry);
    groups.set(groupId, bucket);
  }

  const products: NormalizedProduct[] = [];

  for (const [, bucket] of groups) {
    if (bucket.length === 1) {
      const product = standaloneProduct(bucket[0].row);
      if (product) products.push(product);
      else errors.push({ rowNumber: bucket[0].rowNumber, field: 'Price', message: 'Failed to normalize product' });
      continue;
    }

    const names = bucket.map(entry => entry.row['Item Name'].trim());
    const { baseName, suffixes } = splitBaseNameAndSuffix(names);

    const flags = parseFlags(bucket[0].row);
    const variants: NormalizedVariant[] = [];
    bucket.forEach((entry, index) => {
      const variant = toVariant(entry.row, suffixes[index], flags);
      if (variant) variants.push(variant);
    });

    const first = bucket[0].row;

    products.push({
      groupKey: first.item_group_id?.trim() || null,
      baseName,
      description: (first.Description ?? '').trim(),
      specification: (first.Specification ?? '').trim(),
      categoryPath: parseCategoryPath(first.Category ?? ''),
      tags: flags.tags,
      attributes: flags.attributes,
      sourceUrl: cleanSourceUrl(first['Item Link']),
      brandName: HOUSE_BRAND,
      variants,
    });
  }

  const grouped = products.length > 0 ? splitByStock(products) : { sellable: [], outOfStock: [] };
  return { products: grouped.sellable, outOfStock: grouped.outOfStock, errors };
}
