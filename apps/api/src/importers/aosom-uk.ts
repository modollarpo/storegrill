import type {
  AdaptResult,
  AdapterRowError,
  NormalizedProduct,
  NormalizedVariant,
} from './costway.js';
import { OUT_OF_STOCK_THRESHOLD } from './costway.js';
import { resolveAosomCategory } from './category-taxonomy.js';

const LOCAL_STOCK_THRESHOLD = OUT_OF_STOCK_THRESHOLD === undefined ? 20 : OUT_OF_STOCK_THRESHOLD;

export const AOSOM_UK_PRODUCT_FEED_URL =
  'https://pop-eu-prod.s3.eu-central-1.amazonaws.com/390/200_feed/0/0/51/056920.txt';

export const AOSOM_UK_STOCK_FEED_URL =
  'https://pop-eu-prod.s3.eu-central-1.amazonaws.com/390/200_feed/0/0/4e/056920.txt';

export const AOSOM_UK_SOURCE = `${AOSOM_UK_PRODUCT_FEED_URL}|${AOSOM_UK_STOCK_FEED_URL}`;

export function isAosomUkSource(source: string): boolean {
  return (
    typeof source === 'string' &&
    source.split('|').length === 2 &&
    (source.includes(AOSOM_UK_PRODUCT_FEED_URL) || source.startsWith('file://'))
  );
}

export const HOUSE_BRAND = 'HOMCOM';

const AOSOM_HOUSE_BRANDS: Array<{ match: RegExp; brand: string }> = [
  { match: /^HOMCM(?![a-z])/i, brand: 'HOMCOM' },
  { match: /^Aosom(?![a-z])/i, brand: 'Aosom' },
  { match: /^HOMCOM(?![a-z])/i, brand: 'HOMCOM' },
  { match: /^Outsunny(?![a-z])/i, brand: 'Outsunny' },
  { match: /^PawHut(?![a-z])/i, brand: 'PawHut' },
  { match: /^AIYAPLAY(?![a-z])/i, brand: 'AivyAplay' },
  { match: /^Vinsetto(?![a-z])/i, brand: 'Vinsetto' },
  { match: /^Sportnow(?![a-z])/i, brand: 'Sportnow' },
  { match: /^Kleankin(?![a-z])/i, brand: 'Kleankin' },
  { match: /^Durhand(?![a-z])/i, brand: 'Durhand' },
  { match: /^Zonekiz(?![a-z])/i, brand: 'Zonekiz' },
  { match: /^Soozier(?![a-z])/i, brand: 'Soozier' },
  { match: /^Qaba(?![a-z])/i, brand: 'Qaba' },
];

export function deduceAosomBrand(title: string | null | undefined): string {
  const clean = String(title ?? '').trim();
  for (const { match, brand } of AOSOM_HOUSE_BRANDS) {
    if (match.test(clean)) return brand;
  }
  return HOUSE_BRAND;
}

export interface AosomUkProductRow {
  SKU: string;
  Title: string;
  'Short Description': string;
  Description: string;
  'Base image': string;
  Image: string;
  Category: string;
  Colour: string;
  'Category One': string;
  'Category Two': string;
  Psin: string;
}

export interface AosomUkStockRow {
  SKU: string;
  Stock: string;
  '2B Product Price': string;
  shiping_fee: string;
  '2B-VIP': string;
  '2B-S': string;
  '2B-A': string;
  '2B-B': string;
  '2B-C': string;
  Sin: string;
}

export interface AosomUkMergedRow {
  sku: string;
  title: string;
  shortDescription: string;
  description: string;
  baseImage: string;
  images: string;
  category: string;
  categoryOne: string;
  categoryTwo: string;
  colour: string;
  stock: number;
  sellPriceMinorUnits: number;
}

const PRODUCT_COLS = 11;
const STOCK_COLS = 10;

export function parseAosomUkProductTsv(text: string): AosomUkProductRow[] {
  return (parseTsv(text, PRODUCT_COLS) as string[][]).map(c => ({
    SKU: (c[0] ?? '').trim(),
    Title: (c[1] ?? '').trim(),
    'Short Description': (c[2] ?? '').trim(),
    Description: (c[3] ?? '').trim(),
    'Base image': (c[4] ?? '').trim(),
    Image: (c[5] ?? '').trim(),
    Category: (c[6] ?? '').trim(),
    Colour: (c[7] ?? '').trim(),
    'Category One': (c[8] ?? '').trim(),
    'Category Two': (c[9] ?? '').trim(),
    Psin: (c[10] ?? '').trim(),
  }));
}

export function parseAosomUkStockTsv(text: string): AosomUkStockRow[] {
  return (parseTsv(text, STOCK_COLS) as string[][]).map(c => ({
    SKU: (c[0] ?? '').trim(),
    Stock: (c[1] ?? '').trim(),
    '2B Product Price': (c[2] ?? '').trim(),
    shiping_fee: (c[3] ?? '').trim(),
    '2B-VIP': (c[4] ?? '').trim(),
    '2B-S': (c[5] ?? '').trim(),
    '2B-A': (c[6] ?? '').trim(),
    '2B-B': (c[7] ?? '').trim(),
    '2B-C': (c[8] ?? '').trim(),
    Sin: (c[9] ?? '').trim(),
  }));
}

function parseTsv(text: string, columnCount: number): unknown[][] {
  const rows: string[][] = [];
  const buffer: string[] = [];
  let isHeader = true;
  for (const line of text.split(/\r?\n/)) {
    buffer.push(line);
    if (buffer.join('\n').split('\t').length >= columnCount) {
      const wasHeader = isHeader;
      isHeader = false;
      if (!wasHeader) rows.push(buffer.join('\n').split('\t'));
      buffer.length = 0;
    }
  }
  return rows;
}

export function parseGbpPrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const m = String(raw).replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const value = Number(m[0]);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function stripUkBrand(title: string): string {
  let clean = String(title ?? '').trim();
  clean = clean
    .replace(/\bHOMCOM\b/gi, ' ')
    .replace(/\bAosom\b/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  clean = clean.replace(/[-–—]\s*$/, '').trim();
  return clean;
}

export function stripTextBrand(text: string): string {
  return String(text ?? '')
    .replace(/\bHOMCOM\b/gi, ' ')
    .replace(/\bAosom\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanHtml(html: string): string {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

function httpsify(url: string): string {
  return String(url ?? '').trim().replace(/^http:\/\//i, 'https://');
}

export function normalizeAosomUkImages(base: string, images: string): string[] {
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

function sourceUrl(sku: string): string {
  return `https://www.aosom.co.uk/search/?searchterm=${encodeURIComponent(sku)}`;
}

function familyKey(title: string, colour: string): string {
  const clean = stripUkBrand(title).toLowerCase();
  const colourLower = String(colour ?? '').trim().toLowerCase();
  const parts = clean.split(' ').filter(Boolean).filter(p => p !== colourLower);
  return parts.join(' ');
}

/**
 * Aosom category resolution delegates to the shared taxonomy module so every
 * feed maps onto the same canonical tree (see category-taxonomy.ts).
 */

export function mapAosomCategory(category: string, one: string, two: string): string[] {
  return resolveAosomCategory(one, two, '', '');
}

export function deduceAosomUkCategory(category: string, one: string, two: string, title: string, description = ''): string[] {
  const mapped = mapAosomCategory(category, one, two);
  if (mapped.length > 0) return mapped;
  return deduceAosomCostwayCategory(title, description, one, two);
}

export function deduceAosomCostwayCategory(title: string, description = '', one = '', two = ''): string[] {
  return resolveAosomCategory(one, two, title, description);
}

export function mergeAosomUkFeeds(
  products: AosomUkProductRow[],
  stockRows: AosomUkStockRow[],
): AosomUkMergedRow[] {
  const stockBySku = new Map<string, AosomUkStockRow>();
  for (const s of stockRows) stockBySku.set(s.SKU.trim(), s);

  const merged: AosomUkMergedRow[] = [];
  for (const p of products) {
    const stock = stockBySku.get(p.SKU.trim());
    if (!stock) continue;
    const wholesale = parseGbpPrice(stock['2B-S']);
    if (wholesale == null) continue;
    const stockCount = Number.parseInt(stock.Stock, 10) || 0;
    merged.push({
      sku: p.SKU.trim(),
      title: p.Title,
      shortDescription: p['Short Description'],
      description: p.Description,
      baseImage: p['Base image'],
      images: p.Image,
      category: p.Category,
      categoryOne: p['Category One'],
      categoryTwo: p['Category Two'],
      colour: p.Colour,
      stock: stockCount,
      sellPriceMinorUnits: wholesale,
    });
  }
  return merged;
}

function toVariant(row: AosomUkMergedRow, suffix: string | null): NormalizedVariant | null {
  return {
    sku: row.sku,
    name: row.title,
    variantSuffix: suffix,
    feedPriceMinorUnits: row.sellPriceMinorUnits,
    priceMinorUnits: row.sellPriceMinorUnits,
    supplierStock: row.stock,
    stock: row.stock,
    images: normalizeAosomUkImages(row.baseImage, row.images),
  };
}

export function adaptAosomUkRows(merged: AosomUkMergedRow[]): AdaptResult {
  const errors: AdapterRowError[] = [];
  const valid: AosomUkMergedRow[] = [];

  merged.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.sku) {
      errors.push({ rowNumber, field: 'SKU', message: 'SKU is required' });
      return;
    }
    if (!row.sellPriceMinorUnits) {
      errors.push({ rowNumber, field: '2B Product Price', message: 'Invalid price' });
      return;
    }
    if (!row.title?.trim()) {
      errors.push({ rowNumber, field: 'Title', message: 'Title is required' });
      return;
    }
    valid.push(row);
  });

  const groups = new Map<string, AosomUkMergedRow[]>();
  for (const row of valid) {
    const key = familyKey(row.title, row.colour);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const products: NormalizedProduct[] = [];
  for (const [, bucket] of groups) {
    const colours = [...new Set(bucket.map(r => r.colour?.trim()).filter(Boolean))];
    const first = bucket[0];
    const isMulti = bucket.length > 1 && colours.length > 1;
    const baseName = isMulti ? familyKey(first.title, first.colour) : stripUkBrand(first.title);

    const variants: NormalizedVariant[] = [];
    for (const row of bucket) {
      const suffix = isMulti ? String(row.colour?.trim() || '') : null;
      const variant = toVariant(row, suffix);
      if (variant && (!isMulti || suffix)) variants.push(variant);
    }
    if (variants.length === 0) continue;

    const description = cleanHtml(stripTextBrand(first.description || first.shortDescription));

    products.push({
      groupKey: isMulti ? baseName.toLowerCase() : null,
      baseName,
      description,
      specification: '',
      categoryPath: deduceAosomUkCategory(first.category, first.categoryOne, first.categoryTwo, first.title, first.shortDescription),
      tags: ['aosom', 'uk'],
      attributes: {},
      sourceUrl: sourceUrl(first.sku),
      brandName: deduceAosomBrand(first.title),
      variants,
    });
  }

  const outOfStock: NormalizedProduct[] = [];
  const sellable: NormalizedProduct[] = [];
  for (const p of products) {
    (p.variants.every(v => v.stock >= LOCAL_STOCK_THRESHOLD) ? sellable : outOfStock).push(p);
  }
  return { products: sellable, outOfStock, errors };
}
