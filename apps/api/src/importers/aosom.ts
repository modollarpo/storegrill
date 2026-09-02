import { createMoney, roundUpTo99 } from '@Storegrill/shared';
import type {
  AdaptResult,
  AdapterRowError,
  NormalizedProduct,
  NormalizedVariant,
} from './costway.js';
import { OUT_OF_STOCK_THRESHOLD } from './costway.js';
import { deduceAosomCostwayCategory } from './aosom-uk.js';

export const AOSOM_EU_FEED_URL =
  'https://feed.aosomcdn.com/390/201_feed/0/0/ed/056920.txt';

export const HOUSE_BRAND = 'HOMCOM';
export const SITE_SUFFIXES = ['Aosom Ireland', 'Aosom UK', 'Aosom'];

export const AOSOM_HEADER = [
  'SKU',
  'Title',
  'Short Description',
  'Base image',
  'Image',
  'Colour',
  'Price',
  'Special Price',
  'Stock',
];

export interface AosomFeedRow {
  SKU: string;
  Title: string;
  'Short Description': string;
  'Base image': string;
  Image: string;
  Colour: string;
  Price: string;
  'Special Price': string;
  Stock: string;
}

export function isAosomHeader(headers: string[]): boolean {
  const normalized = headers.map(h => h.trim().toLowerCase());
  return (
    normalized.includes('sku') &&
    normalized.includes('title') &&
    normalized.includes('short description') &&
    normalized.includes('special price') &&
    normalized.includes('stock') &&
    normalized.includes('colour')
  );
}

export function parseAosomTsv(text: string): AosomFeedRow[] {
  const rows: AosomFeedRow[] = [];
  let buffer: string[] = [];
  let isHeader = true;

  const flush = (flag: boolean) => {
    const cols = buffer.join('\n').split('\t');
    if (cols.length < 9) return;
    if (flag) {
      return;
    }
    rows.push({
      SKU: cols[0]?.trim() ?? '',
      Title: cols[1]?.trim() ?? '',
      'Short Description': (cols[2] ?? '').trim(),
      'Base image': (cols[3] ?? '').trim(),
      Image: (cols[4] ?? '').trim(),
      Colour: (cols[5] ?? '').trim(),
      Price: (cols[6] ?? '').trim(),
      'Special Price': (cols[7] ?? '').trim(),
      Stock: (cols[8] ?? '').trim(),
    });
  };

  for (const line of text.split(/\r?\n/)) {
    buffer.push(line);
    if (buffer.join('\n').split('\t').length >= 9) {
      const wasHeader = isHeader;
      isHeader = false;
      flush(wasHeader);
      buffer = [];
    }
  }

  return rows;
}

export function parseEurPrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const m = String(raw).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const value = Number(m[0]);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function charmEur(minorUnits: number): number {
  return Number(roundUpTo99(createMoney(BigInt(minorUnits), 'EUR')).amountMinorUnits);
}

function stripSiteSuffix(title: string): string {
  let clean = (title ?? '').trim();
  for (const suffix of SITE_SUFFIXES) {
    const marker = `|${suffix}`;
    const idx = clean.toUpperCase().lastIndexOf(marker.toUpperCase());
    if (idx !== -1) {
      clean = clean.slice(0, idx).trim();
      break;
    }
    const bareIdx = clean.lastIndexOf(suffix);
    if (bareIdx !== -1 && clean.slice(bareIdx).trim().toLowerCase() === suffix.toLowerCase()) {
      clean = clean.slice(0, bareIdx).trim();
      break;
    }
  }
  return clean;
}

export function stripHouseBrand(title: string): string {
  const clean = stripSiteSuffix(title);
  const brandIdx = clean.toUpperCase().indexOf('HOMCOM');
  if (brandIdx === -1) return clean.trim();
  return clean.slice(0, brandIdx).concat(clean.slice(brandIdx + 'HOMCOM'.length)).replace(/\s{2,}/g, ' ').trim();
}

function cleanTitle(title: string): string {
  return stripHouseBrand(title).replace(/[ \t]+/g, ' ').trim();
}

function cleanDescription(html: string): string {
  const withoutTags = (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return withoutTags.slice(0, 4000);
}

function slugFamiliesToBase(title: string, colour: string): string {
  const cleaned = cleanTitle(title);
  const parts = cleaned.split(' ').filter(Boolean);
  const colourLower = colour.trim().toLowerCase();
  const filtered = parts.filter(p => p.toLowerCase() !== colourLower);
  return filtered.join(' ').trim();
}

export function deduceCategoryPath(title: string, description: string): string[] {
  return deduceAosomCostwayCategory(title, description);
}

function parseStock(stock: string): number {
  return /out\s*of\s*stock/i.test((stock ?? '').trim()) ? 0 : 1;
}

function sourceUrl(sku: string): string {
  return `https://www.aosom.co.uk/search/?searchterm=${encodeURIComponent(sku)}`;
}

function httpsify(url: string): string {
  return (url ?? '').trim().replace(/^http:\/\//i, 'https://');
}

export function normalizeAosomImages(base: string, images: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url: string | undefined) => {
    const rewritten = httpsify(String(url ?? '').trim());
    if (!rewritten || rewritten === 'https://') return;
    if (seen.has(rewritten)) return;
    seen.add(rewritten);
    out.push(rewritten);
  };
  push(base);
  for (const url of (images ?? '').split(',')) push(url);
  return out;
}

function toVariant(row: AosomFeedRow, suffix: string | null): NormalizedVariant | null {
  const special = parseEurPrice(row['Special Price']) ?? parseEurPrice(row.Price);
  if (special == null) return null;
  const supplierStock = parseStock(row.Stock);
  const priceMinorUnits = charmEur(special);
  const listPriceMinorUnits = charmEur(Math.round(special * (1 + 0.20)));
  return {
    sku: row.SKU.trim(),
    name: row.Title.trim(),
    variantSuffix: suffix,
    feedPriceMinorUnits: special,
    priceMinorUnits,
    listPriceMinorUnits,
    supplierStock,
    stock: supplierStock > 0 ? 20 : 0,
    images: normalizeAosomImages(row['Base image'], row.Image),
  };
}

export function adaptAosomRows(rows: AosomFeedRow[]): AdaptResult {
  const errors: AdapterRowError[] = [];
  const valid: AosomFeedRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.SKU?.trim()) {
      errors.push({ rowNumber, field: 'SKU', message: 'SKU is required' });
      return;
    }
    if (!row.Title?.trim()) {
      errors.push({ rowNumber, field: 'Title', message: 'Title is required' });
      return;
    }
    const hasPrice = parseEurPrice(row.Price) != null || parseEurPrice(row['Special Price']) != null;
    if (!hasPrice) {
      errors.push({ rowNumber, field: 'Price', message: `Invalid price value "${row.Price}"` });
      return;
    }
    valid.push(row);
  });

  const groups = new Map<string, AosomFeedRow[]>();
  for (const row of valid) {
    const base = slugFamiliesToBase(row.Title, row.Colour);
    const key = base.toLowerCase();
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const products: NormalizedProduct[] = [];
  for (const [, bucket] of groups) {
    const colours = [...new Set(bucket.map(r => r.Colour?.trim()).filter(Boolean))];
    const first = bucket[0];
    const isMulti = bucket.length > 1 && colours.length > 1;
    const baseName = isMulti ? slugFamiliesToBase(first.Title, first.Colour) : cleanTitle(first.Title);
    const variants: NormalizedVariant[] = [];
    for (const row of bucket) {
      const suffix = isMulti ? String(row.Colour?.trim() || '') : null;
      const variant = toVariant(row, suffix);
      if (variant && (!isMulti || suffix)) variants.push(variant);
    }
    if (variants.length === 0) continue;

    const description = cleanDescription(first['Short Description']);

    products.push({
      groupKey: isMulti ? baseName.toLowerCase() : null,
      baseName,
      description,
      specification: '',
      categoryPath: deduceCategoryPath(first.Title, first['Short Description']),
      tags: ['aosom', 'house'],
      attributes: {},
      sourceUrl: sourceUrl(first.SKU),
      brandName: HOUSE_BRAND,
      variants,
    });
  }

  const outOfStock: NormalizedProduct[] = [];
  const sellable: NormalizedProduct[] = [];
  for (const p of products) {
    (p.variants.every(v => v.stock >= OUT_OF_STOCK_THRESHOLD) ? sellable : outOfStock).push(p);
  }

  return { products: sellable, outOfStock, errors };
}
