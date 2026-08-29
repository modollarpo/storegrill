import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import {
  adaptCostwayRows,
  applyIngestPricing,
  cleanSourceUrl,
  normalizeImages,
  parseCategoryPath,
  parseFlags,
  parsePriceToMinor,
  splitBaseNameAndSuffix,
  type CostwayFeedRow,
} from './costway.js';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'costway-sample.csv');

function loadFixtureRows(): CostwayFeedRow[] {
  const csv = readFileSync(fixturePath, 'utf-8');
  return parse(csv, { columns: true, skip_empty_lines: true, trim: true });
}

describe('parsePriceToMinor', () => {
  it('parses plain decimal strings into integer minor units', () => {
    expect(parsePriceToMinor('104.95')).toBe(10495);
    expect(parsePriceToMinor('1099.95')).toBe(109995);
    expect(parsePriceToMinor('19')).toBe(1900);
  });

  it('accepts comma thousands separators defensively', () => {
    expect(parsePriceToMinor('1,049.95')).toBe(104995);
    expect(parsePriceToMinor('£1,049.95')).toBe(104995);
  });

  it('rejects non-numeric and negative values', () => {
    expect(parsePriceToMinor('abc')).toBeNull();
    expect(parsePriceToMinor('-5.00')).toBeNull();
    expect(parsePriceToMinor('')).toBeNull();
  });
});

describe('applyIngestPricing', () => {
  it('applies 30% markup then rounds up to .99', () => {
    expect(applyIngestPricing(10495)).toBe(13699);
    expect(applyIngestPricing(2495)).toBe(3299);
    expect(applyIngestPricing(4495)).toBe(5899);
  });

  it('no longer bakes a flash-sale discount at ingest (handled by the deal engine)', () => {
    expect(applyIngestPricing(10495, {})).toBe(13699);
    expect(applyIngestPricing(10000, {})).toBe(13099);
  });

  it('prices clearance items at a reduced 10-point markup (net 20%)', () => {
    expect(applyIngestPricing(10495, { clearance: true })).toBe(12599);
    expect(applyIngestPricing(2495, { clearance: true })).toBe(2999);
  });

  it('treats clearance independently of the flash-sale flag', () => {
    expect(applyIngestPricing(10495, { clearance: true })).toBe(12599);
  });
});

describe('normalizeImages', () => {
  it('rewrites http to https, dedupes and drops empties', () => {
    const images = normalizeImages({
      SKU: 'X',
      'Image URL': 'http://www.costway.co.uk/media/a.jpg',
      Image2: 'http://www.costway.co.uk/media/b.jpg',
      Image3: 'http://www.costway.co.uk/media/a.jpg',
      Image4: '   ',
      'is it pre-order': '0',
      'Is it flash-sale': '0',
      'Is it clearance': '0',
      'Is it best seller': '0',
    } as unknown as CostwayFeedRow);
    expect(images).toEqual([
      'https://www.costway.co.uk/media/a.jpg',
      'https://www.costway.co.uk/media/b.jpg',
    ]);
  });
});

describe('cleanSourceUrl', () => {
  it('strips utm parameters and keeps meaningful ones', () => {
    const cleaned = cleanSourceUrl(
      'https://www.costway.co.uk/product.html?ff=4&fp=20&utm_source=Dropship&utm_medium=Dropship',
    );
    expect(cleaned).toBe('https://www.costway.co.uk/product.html?ff=4&fp=20');
  });
});

describe('parseCategoryPath', () => {
  it('splits on > and trims segments', () => {
    expect(parseCategoryPath('Decor > Holiday Decor > Halloween')).toEqual([
      'Decor',
      'Holiday Decor',
      'Halloween',
    ]);
    expect(parseCategoryPath('Kitchen > Cookware & Bakeware')).toEqual(['Kitchen', 'Cookware & Bakeware']);
  });
});

describe('parseFlags', () => {
  it('maps feed flags onto tags and attributes', () => {
    const flags = parseFlags({
      'Is it best seller': '1',
      'Is it clearance': '1',
      'Is it flash-sale': '0',
      'is it pre-order': '1',
    } as unknown as CostwayFeedRow);
    expect(flags.tags).toContain('costway');
    expect(flags.tags).toContain('best-seller');
    expect(flags.tags).toContain('clearance');
    expect(flags.tags).not.toContain('flash-sale');
    expect(flags.attributes.preorder).toBe(true);
  });
});

describe('splitBaseNameAndSuffix', () => {
  it('extracts shared base name and per-variant suffixes', () => {
    const names = [
      '5/6/7/8 Feet White Artificial Christmas Tree with Metal Stand-5 ft',
      '5/6/7/8 Feet White Artificial Christmas Tree with Metal Stand-6 ft',
      '5/6/7/8 Feet White Artificial Christmas Tree with Metal Stand-7 ft',
      '5/6/7/8 Feet White Artificial Christmas Tree with Metal Stand-8 ft',
    ];
    const result = splitBaseNameAndSuffix(names);
    expect(result.baseName).toBe('5/6/7/8 Feet White Artificial Christmas Tree with Metal Stand');
    expect(result.suffixes).toEqual(['5 ft', '6 ft', '7 ft', '8 ft']);
  });

  it('falls back to full names when no common suffix pattern exists', () => {
    const result = splitBaseNameAndSuffix(['Red Chair', 'Blue Table']);
    expect(result.suffixes).toEqual([null, null]);
  });
});

describe('adaptCostwayRows', () => {
  const rows = loadFixtureRows();
  const result = adaptCostwayRows(rows);

it('clamps stock at or below the out-of-stock threshold while preserving supplier count', () => {
const adapted = adaptCostwayRows([
{ ...rows[0], SKU: 'LOW1', Stock: '7' },
{ ...rows[0], SKU: 'EDGE', Stock: '10' },
{ ...rows[0], SKU: 'OK1', Stock: '11' },
{ ...rows[0], SKU: 'GARBAGE', Stock: '' },
] as CostwayFeedRow[]);
const bySku = new Map(
adapted.products.flatMap(p => p.variants.map(v => [v.sku, v])),
);
expect(bySku.get('LOW1')).toMatchObject({ stock: 0, supplierStock: 7 });
expect(bySku.get('EDGE')).toMatchObject({ stock: 0, supplierStock: 10 });
expect(bySku.get('OK1')).toMatchObject({ stock: 11, supplierStock: 11 });
expect(bySku.get('GARBAGE')).toMatchObject({ stock: 0, supplierStock: 0 });
});

  it('adapts every fixture row without errors', () => {
    expect(rows.length).toBeGreaterThan(10);
    expect(result.errors).toHaveLength(0);
    expect(result.products.length).toBeGreaterThan(5);
  });

  it('groups the christmas tree variants into one product', () => {
    const tree = result.products.find(p => p.groupKey === 'CM19733CM19736');
    expect(tree).toBeDefined();
    expect(tree!.baseName).toBe('5/6/7/8 Feet White Artificial Christmas Tree with Metal Stand');
    expect(tree!.variants.map(v => v.variantSuffix)).toEqual(['5 ft', '6 ft', '7 ft', '8 ft']);
    expect(tree!.variants.map(v => v.sku)).toEqual(['CM19733', 'CM19734', 'CM19735', 'CM19736']);
    expect(tree!.variants.every(v => v.priceMinorUnits % 100 === 99)).toBe(true);
  });

  it('treats rows whose group id equals their sku as standalone products', () => {
    const skeleton = result.products.find(p => p.baseName.includes('Human Skeleton'));
    expect(skeleton).toBeDefined();
    expect(skeleton!.groupKey).toBeNull();
    expect(skeleton!.variants).toHaveLength(1);
    expect(skeleton!.variants[0].sku).toBe('AP2181');
  });

  it('marks up all prices and rewrites image schemes', () => {
    for (const product of result.products) {
      for (const variant of product.variants) {
        expect(variant.priceMinorUnits % 100).toBe(99);
        expect(variant.feedPriceMinorUnits).toBeLessThan(variant.priceMinorUnits);
        for (const image of variant.images) {
          expect(image.startsWith('https://')).toBe(true);
        }
      }
    }
  });

  it('strips utm tracking from every source url', () => {
    for (const product of result.products) {
      expect(product.sourceUrl.toLowerCase()).not.toContain('utm_');
      expect(product.sourceUrl.startsWith('https://')).toBe(true);
    }
  });

  it('reports row-level errors for malformed rows', () => {
    const bad = adaptCostwayRows([
      { ...rows[0], SKU: '' },
      { ...rows[0], SKU: 'OK1', Price: 'not-a-price' },
      { ...rows[0], SKU: 'OK2', Price: '54.95' },
    ] as CostwayFeedRow[]);
    expect(bad.errors.map(e => e.field)).toEqual(['SKU', 'Price']);
    expect(bad.products).toHaveLength(1);
  });
});
