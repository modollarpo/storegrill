import { describe, it, expect } from 'vitest';
import {
  adaptAosomUkRows,
  mergeAosomUkFeeds,
  parseAosomUkProductTsv,
  parseAosomUkStockTsv,
  parseGbpPrice,
  stripUkBrand,
  deduceAosomUkCategory,
  isAosomUkSource,
  AOSOM_UK_SOURCE,
  type AosomUkProductRow,
  type AosomUkStockRow,
} from './aosom-uk.js';

const PRODUCT_HEADER =
  'SKU\tTitle\tShort Description\tDescription\tBase image\tImage\tCategory\tColour\tCategory One\tCategory Two\tPsin';
const STOCK_HEADER =
  'SKU\tStock\t2B Product Price\tshiping_fee\t2B-VIP\t2B-S\t2B-A\t2B-B\t2B-C\tSin';

function productRow(sku: string, overrides: Partial<AosomUkProductRow> = {}): AosomUkProductRow {
  return {
    SKU: sku,
    Title: `HOMCOM Rattan Garden Sofa - Grey`,
    'Short Description': 'Rattan sofa set',
    Description: 'Detailed rattan description',
    'Base image': 'http://img.aosomcdn.com/base.jpg',
    Image: 'http://img.aosomcdn.com/img1.jpg',
    Category: 'Garden & Outdoor',
    Colour: 'Grey',
    'Category One': 'Garden Furniture',
    'Category Two': 'Rattan Furniture',
    Psin: 'PSIN',
    ...overrides,
  };
}

function stockRow(sku: string, overrides: Partial<AosomUkStockRow> = {}): AosomUkStockRow {
  return {
    SKU: sku,
    Stock: '30',
    '2B Product Price': '99.00 GBP',
    shiping_fee: '7.84',
    '2B-VIP': '58.00 GBP',
    '2B-S': '60.49 GBP',
    '2B-A': '61.12 GBP',
    '2B-B': '61.75 GBP',
    '2B-C': '62.38 GBP',
    Sin: 'SIN',
    ...overrides,
  };
}

describe('parseGbpPrice', () => {
  it('parses GBP prices with a currency suffix', () => {
    expect(parseGbpPrice('60.49 GBP')).toBe(6049);
    expect(parseGbpPrice('54.29 GBP')).toBe(5429);
  });
  it('parses plain decimals', () => {
    expect(parseGbpPrice('45.00')).toBe(4500);
  });
  it('rejects empty and non-numeric', () => {
    expect(parseGbpPrice('')).toBeNull();
    expect(parseGbpPrice('abc')).toBeNull();
  });
});

describe('parseAosomUkProductTsv / stock', () => {
  it('parses the header plus data rows for the product feed', () => {
    const text = [PRODUCT_HEADER, `${'AAA'}\tTitle\tSD\tD\timg0\timg1\tCat\tCol\tOne\tTwo\tPSIN`].join('\n');
    const rows = parseAosomUkProductTsv(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].SKU).toBe('AAA');
    expect(rows[0]['Category Two']).toBe('Two');
  });

  it('reassembles a multi-line description spanning physical newlines', () => {
    const text = [PRODUCT_HEADER, 'AAA\tTitle\tSD\tline one\nline two\timg0\timg1\tCat\tCol\tOne\tTwo\tPSIN'].join('\n');
    const rows = parseAosomUkProductTsv(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].Description).toBe('line one\nline two');
  });

  it('parses the stock feed including numeric stock and tier prices', () => {
    const text = [STOCK_HEADER, 'AAA\t30\t99.00 GBP\t7.84\t58\t60.49 GBP\t61\t62\t63\tSIN'].join('\n');
    const rows = parseAosomUkStockTsv(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].Stock).toBe('30');
    expect(rows[0]['2B-S']).toBe('60.49 GBP');
  });
});

describe('mergeAosomUkFeeds', () => {
  it('joins product and stock on SKU, using 2B-S as wholesale and numeric stock', () => {
    const products = [productRow('AAA'), productRow('BBB')];
    const stock = [stockRow('AAA'), stockRow('BBB', { Stock: '5' })];
    const merged = mergeAosomUkFeeds(products, stock);
    expect(merged).toHaveLength(2);
    const aaa = merged.find(m => m.sku === 'AAA')!;
    expect(aaa.stock).toBe(30);
    expect(aaa.sellPriceMinorUnits).toBe(6049);
  });

  it('drops products with no matching stock row', () => {
    const products = [productRow('AAA'), productRow('NO_STOCK')];
    const stock = [stockRow('AAA')];
    const merged = mergeAosomUkFeeds(products, stock);
    expect(merged.map(m => m.sku)).toEqual(['AAA']);
  });
});

describe('stripUkBrand', () => {
  it('removes HOMCOM and Aosom tokens while keeping the colour suffix', () => {
    expect(stripUkBrand('HOMCOM Rattan Garden Sofa - Grey')).toBe('Rattan Garden Sofa - Grey');
    expect(stripUkBrand('Aosom Rattan Garden Sofa')).toBe('Rattan Garden Sofa');
  });
});

describe('deduceAosomUkCategory', () => {
  it('maps a known Aosom path onto the Costway garden taxonomy', () => {
    expect(deduceAosomUkCategory('Garden & Outdoor', 'Garden Furniture', 'Rattan Furniture', '')).toEqual([
      'Outdoor',
      'Outdoor & Patio Furniture',
      'Rattan Furniture',
    ]);
  });
  it('falls back through keywords then Uncategorised', () => {
    expect(deduceAosomUkCategory('Unknown', 'One', 'Two', 'mystery gizmo')).toEqual(['Uncategorised']);
  });
});

describe('adaptAosomUkRows', () => {
  it('sets base price = wholesale and compare-at = wholesale x 1.20, both charmed to .99', () => {
    const products = [productRow('AAA')];
    const stock = [stockRow('AAA', { '2B-S': '60.49 GBP' })];
    const merged = mergeAosomUkFeeds(products, stock);
    const result = adaptAosomUkRows(merged);
    const variant = result.products[0].variants[0];
    expect(variant.feedPriceMinorUnits).toBe(6049);
    expect(variant.priceMinorUnits).toBe(6099);
    expect(variant.listPriceMinorUnits!).toBeGreaterThan(variant.priceMinorUnits);
  });

  it('strips HOMCOM from the base name and tags as uk', () => {
    const merged = mergeAosomUkFeeds([productRow('AAA')], [stockRow('AAA')]);
    const result = adaptAosomUkRows(merged);
    const p = result.products[0];
    expect(p.baseName).not.toContain('HOMCOM');
    expect(p.tags).toContain('uk');
  });

  it('routes products with stock below 20 to outOfStock', () => {
    const products = [productRow('LOW', { Title: 'Low Stock Item' }), productRow('OK', { Title: 'OK Stock Item' })];
    const stock = [stockRow('LOW', { Stock: '5' }), stockRow('OK', { Stock: '30' })];
    const merged = mergeAosomUkFeeds(products, stock);
    const result = adaptAosomUkRows(merged);
    const low = result.outOfStock.find(p => p.variants[0].sku === 'LOW');
    const ok = result.products.find(p => p.variants[0].sku === 'OK');
    expect(low).toBeDefined();
    expect(ok).toBeDefined();
  });
});

describe('isAosomUkSource', () => {
  it('recognises the two-URL source and rejects single-file sources', () => {
    expect(isAosomUkSource(AOSOM_UK_SOURCE)).toBe(true);
    expect(isAosomUkSource('https://feed.aosomcdn.com/single.txt')).toBe(false);
  });
});
