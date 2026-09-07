import { describe, expect, it } from 'vitest';
import {
  buildCategoryCards,
  buildHeroSlides,
  buildPromos,
  buildRows,
  endLabel,
  type CategoryRow,
  type DealRow,
  type HomeGridSection,
} from './home-content-build';

const CATEGORY: CategoryRow = {
  id: 'cat-1',
  name: 'Home & Kitchen',
  slug: 'home-kitchen',
  featured: [
    { id: 'p1', name: 'Kettle', slug: 'kettle', thumbnail: 'https://cdn.storegrill.net/kettle.jpg' },
    { id: 'p2', name: 'Toaster', slug: 'toaster', thumbnail: 'https://cdn.storegrill.net/toaster.jpg' },
  ],
};

describe('buildCategoryCards', () => {
  it('builds a card from a real category and its real featured products', () => {
    const cards = buildCategoryCards([CATEGORY], 'en');
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe('Home & Kitchen');
    expect(cards[0].linkHref).toBe('/categories/home-kitchen');
    expect(cards[0].tiles).toHaveLength(2);
    expect(cards[0].tiles[0]).toEqual({
      title: 'Kettle',
      image: 'https://cdn.storegrill.net/kettle.jpg',
      href: '/products/kettle',
    });
  });

  it('omits categories with no real stocked product thumbnails', () => {
    const cards = buildCategoryCards([{ id: 'x', name: 'Empty', slug: 'empty' }], 'en');
    expect(cards).toHaveLength(0);
  });

  it('omits categories with missing name or slug', () => {
    const cards = buildCategoryCards([{ id: 'y', featured: [{ name: 'P', slug: 'p', thumbnail: 'https://cdn.storegrill.net/p.jpg' }] }], 'en');
    expect(cards).toHaveLength(0);
  });
});

describe('buildHeroSlides', () => {
  const deal: DealRow = {
    id: 'deal-1',
    status: 'LIVE',
    enabled: true,
    slug: 'costway-flash-sale',
    endsAt: '2026-09-09T23:59:59Z',
    variants: [
      {
        product: { thumbnail: 'https://cdn.storegrill.net/hairdryer.jpg', name: 'Professional Portable Hood Hairdryer' },
        discountPercent: 25,
      },
    ],
  };

  it('builds a slide only from real live-deal product data and real discount math', () => {
    const slides = buildHeroSlides([deal], 'en');
    expect(slides).toHaveLength(1);
    expect(slides[0].title).toBe('Professional Portable Hood Hairdryer');
    expect(slides[0].image).toBe('https://cdn.storegrill.net/hairdryer.jpg');
    expect(slides[0].href).toBe('/deals/costway-flash-sale');
    expect(slides[0].subtitle).toContain('25% off');
    expect(slides[0].subtitle).toContain('Ends');
  });

  it('never pads with invented slides - empty when no qualified deal exists', () => {
    const poor: DealRow = {
      ...deal,
      variants: [{ product: { name: 'No thumb' }, discountPercent: 25 }],
    };
    expect(buildHeroSlides([poor], 'en')).toHaveLength(0);
  });

  it('caps at three real slides', () => {
    const mk = (i: number): DealRow => ({
      id: `d${i}`,
      status: 'LIVE',
      enabled: true,
      slug: `s${i}`,
      variants: [{ product: { thumbnail: `https://cdn.storegrill.net/${i}.jpg`, name: `P${i}` }, discountPercent: 10 }],
    });
    const slides = buildHeroSlides([1, 2, 3, 4].map(i => mk(i)), 'en');
    expect(slides).toHaveLength(3);
  });
});

describe('buildRows', () => {
  const card = (n: string): HomeGridSection => ({ title: n, tiles: [] });

  it('places promos in the final row alongside real category cards', () => {
    const rows = buildRows([card('A'), card('B'), card('C'), card('D')], buildPromos('en'));
    expect(rows).toHaveLength(2);
    expect(rows[0].map(s => s.title)).toEqual(['A', 'B']);
    expect(rows[1].map(s => s.title)).toEqual(['C', 'D', 'Sell on Storegrill', 'Multi-Currency Global Checkout']);
  });

  it('returns only promos when there are no real categories', () => {
    const rows = buildRows([], buildPromos('en'));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(2);
  });

  it('never exceeds four items in a row', () => {
    const rows = buildRows([1, 2, 3, 4, 5, 6].map(i => card(`C${i}`)), buildPromos('en'));
    for (const row of rows) expect(row.length).toBeLessThanOrEqual(4);
  });
});

describe('endLabel', () => {
  it('formats a real end date for the language', () => {
    expect(endLabel('2026-09-09T23:59:59Z', 'en')).toMatch(/\d+/);
  });
  it('returns empty for missing or invalid dates', () => {
    expect(endLabel(undefined, 'en')).toBe('');
    expect(endLabel('not-a-date', 'en')).toBe('');
  });
});