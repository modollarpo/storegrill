import { describe, it, expect } from 'vitest';
import {
  AOSOM_CATEGORY_MAP,
  AOSOM_KEYWORD_RULES,
  CANONICAL_CATEGORY_PATHS,
  CANONICAL_CATEGORY_PATH_SET,
  CANONICAL_ROOTS,
  UNCATEGORISED,
  canonicalizePath,
  clampToCanonical,
  joinPath,
  partsOf,
  resolveAosomCategory,
} from './category-taxonomy.js';

describe('canonical taxonomy integrity', () => {
  it('declares unique paths', () => {
    expect(new Set(CANONICAL_CATEGORY_PATHS).size).toBe(CANONICAL_CATEGORY_PATHS.length);
  });

  it('declares exactly the curated roots and each exists in the tree', () => {
    expect([...CANONICAL_ROOTS].sort()).toEqual(
      [
        'Appliances',
        'Baby & Kids',
        'Bath',
        'Decor',
        'Furniture',
        'Health & Beauty',
        'Kitchen',
        'Outdoor',
        'Pets',
        'Sports',
        'Toys & Hobbies',
      ].sort(),
    );
    for (const root of CANONICAL_ROOTS) {
      expect(CANONICAL_CATEGORY_PATH_SET.has(root)).toBe(true);
    }
  });

  it('every Aosom direct-map target exists in the canonical tree', () => {
    for (const m of AOSOM_CATEGORY_MAP) {
      expect(CANONICAL_CATEGORY_PATH_SET.has(m.path), `map target missing: ${m.path}`).toBe(true);
    }
  });

  it('every keyword-rule target exists in the canonical tree', () => {
    for (const rule of AOSOM_KEYWORD_RULES) {
      expect(CANONICAL_CATEGORY_PATH_SET.has(rule.path), `keyword target missing: ${rule.path}`).toBe(true);
    }
  });

  it('direct-map keys are unique', () => {
    const keys = AOSOM_CATEGORY_MAP.map(m => `${m.one}|${m.two}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('resolveAosomCategory', () => {
  it('maps a known one/two pair onto the shared tree without forking', () => {
    expect(resolveAosomCategory('Garden Furniture', 'Rattan Furniture', '', '')).toEqual([
      'Outdoor',
      'Outdoor & Patio Furniture',
    ]);
    expect(resolveAosomCategory('Tool Storage', 'Tool Boxes', '', '')).toEqual(['Outdoor', 'Garden', 'Garden Tools']);
  });

  it('maps Christmas tree combos onto the Holiday Decor subtree', () => {
    expect(resolveAosomCategory('Christmas Trees', 'Pre Lit Christmas Trees', '', '')).toEqual([
      'Decor',
      'Holiday Decor',
      'Christmas',
      'Christmas Tree',
    ]);
  });

  it('falls back to keyword rules for unmapped combos', () => {
    expect(resolveAosomCategory('?', '?', 'HOMCOM Cleaning Cart On Wheels', 'multifunctional janitorial trolley')).toEqual([
      'Kitchen',
    ]);
    expect(resolveAosomCategory('', '', 'HOMCOM Cosmetic Stool', 'salon massage spa chair')).toEqual(['Furniture']);
    expect(resolveAosomCategory('', '', 'HOMCOM Tree', 'artificial christmas tree with metal stand')).toEqual([
      'Decor',
      'Holiday Decor',
    ]);
  });

  it('collapses unknown input to Uncategorised', () => {
    expect(resolveAosomCategory('One', 'Two', 'mystery gizmo', '')).toEqual([UNCATEGORISED]);
  });
});

describe('clampToCanonical', () => {
  it('keeps a canonical path unchanged', () => {
    expect(clampToCanonical(['Outdoor', 'Garden', 'Garden Tools'])).toEqual(['Outdoor', 'Garden', 'Garden Tools']);
  });

  it('truncates a non-canonical suffix to the longest canonical prefix', () => {
    expect(clampToCanonical(['Furniture', 'Bogus Leaf'])).toEqual(['Furniture']);
  });

  it('returns an empty array when no prefix matches', () => {
    expect(clampToCanonical(['Never Seen', 'Anything'])).toEqual([]);
  });
});

describe('canonicalizePath', () => {
  it('passes canonical paths through', () => {
    expect(canonicalizePath(['Bath'])).toEqual(['Bath']);
  });

  it('clamps unknown leaves to a canonical ancestor', () => {
    expect(canonicalizePath(['Pets', 'Dog Supplies', 'Mega Kennel Plus'])).toEqual(['Pets', 'Dog Supplies']);
  });

  it('collapses fully unknown paths to Uncategorised', () => {
    expect(canonicalizePath(['Totally', 'Made Up'])).toEqual([UNCATEGORISED]);
  });
});

describe('partsOf / joinPath', () => {
  it('round-trips a path', () => {
    expect(joinPath(partsOf('Outdoor > Garden > Garden Tools'))).toBe('Outdoor > Garden > Garden Tools');
  });
});