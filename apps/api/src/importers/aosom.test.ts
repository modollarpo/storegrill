import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adaptAosomRows,
  deduceCategoryPath,
  isAosomHeader,
  parseAosomTsv,
  parseEurPrice,
  stripHouseBrand,
  HOUSE_BRAND,
} from './aosom.js';

const fixturePath = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'aosom-sample.txt');

function loadFixtureText(): string {
  return readFileSync(fixturePath, 'utf-8');
}

describe('isAosomHeader', () => {
  it('recognises the tab-delimited Aosom header', () => {
    expect(
      isAosomHeader(['SKU', 'Title', 'Short Description', 'Base image', 'Image', 'Colour', 'Price', 'Special Price', 'Stock']),
    ).toBe(true);
  });

  it('rejects a Costway-style comma header', () => {
    expect(isAosomHeader(['SKU', 'Item Name', 'Price', 'Category', 'Stock'])).toBe(false);
  });
});

describe('parseAosomTsv', () => {
  it('parses the header plus every data row', () => {
    const rows = parseAosomTsv(loadFixtureText());
    expect(rows).toHaveLength(4);
    expect(rows[1].SKU).toBe('02-0693');
    expect(rows[1]['Colour']).toBe('Black');
  });

  it('reassembles a multi-line Short Description into a single field', () => {
    const rows = parseAosomTsv(loadFixtureText());
    const chair = rows[1];
    expect(chair['Short Description']).toContain('Wide use');
    expect(chair['Short Description']).toContain('Adjustable height');
    expect(chair['Short Description']).toContain('Padded seat');
    expect(chair.Stock).toBe('In Stock');
  });

  it('treats a tab-separated record across physical newlines correctly', () => {
    const rows = parseAosomTsv(loadFixtureText());
    expect(rows[2].SKU).toBe('02-0694');
    expect(rows[2]['Colour']).toBe('White');
  });
});

describe('parseEurPrice', () => {
  it('parses EUR prices with a currency suffix', () => {
    expect(parseEurPrice('113.99 EUR')).toBe(11399);
    expect(parseEurPrice('139.99 EUR')).toBe(13999);
  });

  it('parses plain decimal values', () => {
    expect(parseEurPrice('45.00')).toBe(4500);
  });

  it('rejects empty and non-numeric values', () => {
    expect(parseEurPrice('')).toBeNull();
    expect(parseEurPrice('abc')).toBeNull();
    expect(parseEurPrice(null)).toBeNull();
  });
});

describe('stripHouseBrand', () => {
  it('removes HOMCOM prefix and site suffix from titles', () => {
    expect(
      stripHouseBrand('HOMCOM Cleaning Carts On Wheels, Janitorial Trolley, Household Storage Cart|Aosom Ireland'),
    ).toBe('Cleaning Carts On Wheels, Janitorial Trolley, Household Storage Cart');
  });

  it('strips the site suffix without a HOMCOM prefix', () => {
    expect(stripHouseBrand('Random Product Title|Aosom Ireland')).toBe('Random Product Title');
  });
});

describe('deduceCategoryPath', () => {
  it('maps cleaning carts to the Costway Kitchen taxonomy', () => {
    expect(deduceCategoryPath('HOMCOM Cleaning Cart On Wheels', 'multifunctional janitorial trolley')).toEqual([
      'Kitchen',
    ]);
  });

  it('maps salon chairs to the Costway furniture taxonomy', () => {
    expect(deduceCategoryPath('HOMCOM Cosmetic Stool', 'salon massage spa chair')).toEqual(['Furniture']);
  });

  it('maps holiday items from the description keywords', () => {
    expect(deduceCategoryPath('HOMCOM Tree', 'artificial christmas tree with metal stand')).toEqual([
      'Decor',
      'Holiday Decor',
    ]);
  });

  it('falls back to Uncategorised', () => {
    expect(deduceCategoryPath('Mystery Item XYZ', 'no obvious keywords here')).toEqual(['Uncategorised']);
  });
});

describe('adaptAosomRows', () => {
  const rows = parseAosomTsv(loadFixtureText());
  const result = adaptAosomRows(rows);

  it('adapts every fixture row without errors', () => {
    expect(result.errors).toHaveLength(0);
    expect(result.products.length + result.outOfStock.length).toBeGreaterThan(0);
  });

  it('strips HOMCOM from product base names', () => {
    const cleaning = result.products.find(p => p.baseName.includes('Cleaning'));
    expect(cleaning).toBeDefined();
    expect(cleaning!.baseName).not.toContain('HOMCOM');
    expect(cleaning!.brandName).toBe(HOUSE_BRAND);
    expect(cleaning!.baseName).not.toContain('Aosom');
  });

  it('groups colour variants into a single product with colour suffixes', () => {
    const salon = result.products.find(p => p.baseName.toLowerCase().includes('cosmetic stool'));
    expect(salon).toBeDefined();
    expect(salon!.groupKey).not.toBeNull();
    expect(salon!.variants.map(v => v.variantSuffix).sort()).toEqual(['Black', 'White']);
    expect(salon!.variants.every(v => v.priceMinorUnits % 100 === 99)).toBe(true);
  });

  it('preserves a discounted list price for savings display', () => {
    const cleaning = result.products.find(p => p.baseName.includes('Cleaning'));
    const variant = cleaning!.variants[0];
    expect(variant.listPriceMinorUnits).toBeDefined();
    expect(variant.listPriceMinorUnits!).toBeGreaterThan(variant.priceMinorUnits);
  });

  it('dedupes images and rewrites http to https', () => {
    const cleaning = result.products.find(p => p.baseName.includes('Cleaning'));
    const images = cleaning!.variants[0].images;
    for (const image of images) expect(image.startsWith('https://')).toBe(true);
    expect(new Set(images).size).toBe(images.length);
  });

  it('sends out-of-stock products to the outOfStock bucket', () => {
    const tree = result.outOfStock.find(p => p.baseName.toLowerCase().includes('christmas tree'));
    expect(tree).toBeDefined();
    expect(tree!.variants[0].stock).toBe(0);
    expect(result.products.find(p => p.baseName.toLowerCase().includes('christmas tree'))).toBeUndefined();
  });
});
