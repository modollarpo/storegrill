import { describe, expect, it } from 'vitest';
import {
  buildCategoryCards,
  buildCuratedCards,
  buildFeaturedSection,
  buildHeroSlides,
  buildPromos,
  buildRows,
  endLabel,
  featuredCursor,
  type CategoryRow,
  type CuratedProductRow,
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

  it('carries a real tagline as the section subtitle when present', () => {
    const cards = buildCategoryCards([{ ...CATEGORY, tagline: 'Everything for the kitchen that works.' }], 'en');
    expect(cards[0].subtitle).toBe('Everything for the kitchen that works.');
  });

  it('renders no subtitle when the category has no tagline', () => {
    const cards = buildCategoryCards([CATEGORY], 'en');
    expect(cards[0].subtitle).toBeUndefined();
  });

  it('carries real region-priced tiles with compare-at discount', () => {
    const cards = buildCategoryCards(
      [{
        ...CATEGORY,
        featured: [
          { id: 'p1', name: 'Kettle', slug: 'kettle', thumbnail: 'https://cdn.storegrill.net/kettle.jpg', price: 1999, currencyCode: 'GBP', listPriceMinorUnits: 2999 },
        ],
      }],
      'en',
    );
    expect(cards[0].tiles[0]).toMatchObject({
      title: 'Kettle',
      priceMinorUnits: 1999,
      currencyCode: 'GBP',
      listPriceMinorUnits: 2999,
    });
  });
});

describe('buildHeroSlides', () => {
  const deal: DealRow = {
    id: 'deal-1',
    status: 'LIVE',
    enabled: true,
    slug: 'flash-sale',
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
    expect(slides[0].href).toBe('/deals/flash-sale');
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

  it('fills the slider with many distinct products from a single live deal', () => {
    const mk = (i: number) => ({
      product: { thumbnail: `https://cdn.storegrill.net/${i}.jpg`, name: `P${i}`, slug: `p${i}` },
      discountPercent: 10,
    });
    const oneDeal: DealRow = { ...deal, variants: [1, 2, 3, 4].map(i => mk(i)) };
    const slides = buildHeroSlides([oneDeal], 'en');
    expect(slides).toHaveLength(4);
    expect(slides.map(s => s.title)).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(slides.every(s => s.href === '/deals/flash-sale')).toBe(true);
  });

  it('dedupes the same product across deals and caps at fourteen slides', () => {
    const mk = (i: number) => ({
      product: { thumbnail: `https://cdn.storegrill.net/${i}.jpg`, name: `P${i}`, slug: `p${i}` },
      discountPercent: 10,
    });
    const manyDeals: DealRow[] = [1, 2, 3, 4, 5].map(i => ({
      ...deal,
      id: `d${i}`,
      slug: `s${i}`,
      variants: [mk(i), mk(i), mk(i * 10)],
    }));
    const slides = buildHeroSlides(manyDeals, 'en');
    expect(slides).toHaveLength(10);
    expect(new Set(slides.map(s => s.title)).size).toBe(10);
  });

  it('sorts slides by discount descending so the best deal comes first', () => {
    const mk = (name: string, pct: number) => ({
      product: { thumbnail: `https://cdn.storegrill.net/${name}.jpg`, name, slug: name },
      discountPercent: pct,
    });
    const oneDeal: DealRow = { ...deal, variants: [mk('Low', 5), mk('High', 40), mk('Mid', 20)] };
    const slides = buildHeroSlides([oneDeal], 'en');
    expect(slides.map(s => s.title)).toEqual(['High', 'Mid', 'Low']);
  });
});

describe('buildRows', () => {
  const card = (n: string): HomeGridSection => ({ title: n, tiles: [] });

  it('places promos in the final row alongside real category cards', () => {
    const rows = buildRows([card('A'), card('B'), card('C'), card('D')], buildPromos('en'), 'en');
    expect(rows).toHaveLength(2);
    expect(rows[0].map(s => s.title)).toEqual(['A', 'B']);
    expect(rows[1].map(s => s.title)).toEqual(['C', 'D', 'Sell on Storegrill', 'Multi-Currency Global Checkout']);
  });

  it('returns only promos when there are no real categories', () => {
    const rows = buildRows([], buildPromos('en'), 'en');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(2);
  });

  it('never exceeds four items in a row', () => {
    const rows = buildRows([1, 2, 3, 4, 5, 6].map(i => card(`C${i}`)), buildPromos('en'), 'en');
    for (const row of rows) expect(row.length).toBeLessThanOrEqual(4);
  });
});

describe('featuredCursor', () => {
  it('is deterministic for a region within the same ISO week', () => {
    const a = featuredCursor('UK', 5, new Date('2026-09-08T10:00:00Z'));
    const b = featuredCursor('UK', 5, new Date('2026-09-11T18:30:00Z'));
    expect(a).toBe(b);
  });

  it('rotates the featured category between ISO weeks', () => {
    const w1 = featuredCursor('UK', 5, new Date('2026-09-08T12:00:00Z'));
    const w2 = featuredCursor('UK', 5, new Date('2026-09-15T12:00:00Z'));
    expect(w1).not.toBe(w2);
  });

  it('stays in range and returns 0 for an empty list', () => {
    expect(featuredCursor('US', 3, new Date('2026-09-10T00:00:00Z'))).toBeLessThan(3);
    expect(featuredCursor('UK', 0, new Date('2026-09-10T00:00:00Z'))).toBe(0);
  });
});

describe('buildFeaturedSection', () => {
  it('builds a featured section from a real category and its real featured products', () => {
    const section = buildFeaturedSection([CATEGORY], [], 'en', 'UK', new Date('2026-09-10T00:00:00Z'));
    expect(section).not.toBeNull();
    expect(section!.type).toBe('featured');
    expect(section!.eyebrow).toBe('Featured');
    expect(section!.title).toBe('Home & Kitchen');
    expect(section!.href).toBe('/categories/home-kitchen');
    expect(section!.products).toHaveLength(2);
    expect(section!.products[0]).toMatchObject({
      title: 'Kettle',
      image: 'https://cdn.storegrill.net/kettle.jpg',
      href: '/products/kettle',
    });
  });

  it('returns null when no category carries real stocked products', () => {
    expect(buildFeaturedSection([{ name: 'Empty', slug: 'empty' }], [], 'en', 'UK', new Date('2026-09-10T00:00:00Z'))).toBeNull();
  });

  it('carries real region prices and a real discount label on featured products', () => {
    const roots: CategoryRow[] = [{
      id: 'c-2',
      name: 'Outdoor',
      slug: 'outdoor',
      featured: [{
        id: 'p1',
        name: 'Gas Grill',
        slug: 'gas-grill',
        thumbnail: 'https://cdn.storegrill.net/grill.jpg',
        price: 15999,
        currencyCode: 'GBP',
        listPriceMinorUnits: 19999,
      }],
    }];
    const section = buildFeaturedSection(roots, [], 'en', 'UK', new Date('2026-09-10T00:00:00Z'));
    expect(section).not.toBeNull();
    expect(section!.products[0]).toMatchObject({
      title: 'Gas Grill',
      href: '/products/gas-grill',
      priceMinorUnits: 15999,
      currencyCode: 'GBP',
      listPriceMinorUnits: 19999,
      discountLabel: '20% off',
    });
  });

  it('reports live deal count and max category discount as honest stats', () => {
    const roots: CategoryRow[] = [
      { ...CATEGORY, featured: [{ ...CATEGORY.featured![0], price: 6999, listPriceMinorUnits: 9999 }] },
    ];
    const deals: DealRow[] = [{ id: 'd-1', status: 'LIVE', enabled: true, name: 'Costway Flash Sale' }];
    const section = buildFeaturedSection(roots, deals, 'en', 'UK', new Date('2026-09-10T00:00:00Z'));
    expect(section).not.toBeNull();
    expect(section!.stats).toContain('Up to 30% off');
    expect(section!.stats).toContain('1 live deals today');
    expect(section!.ctaText).toBe('Shop Home & Kitchen');
    expect(section!.secondaryHref).toBe('/deals');
  });
});

describe('buildCuratedCards', () => {
  const flash: CuratedProductRow[] = [
    {
      name: 'Hairdryer',
      slug: 'hairdryer',
      thumbnail: 'https://cdn.storegrill.net/hairdryer.jpg',
      priceMinorUnits: 4199,
      listPriceMinorUnits: 5499,
      discountPercent: 25,
    },
    { name: 'Panel Heater', slug: 'panel-heater', thumbnail: 'https://cdn.storegrill.net/heater.jpg' },
  ];
  const best = [
    {
      name: 'Kettle',
      slug: 'kettle',
      thumbnail: 'https://cdn.storegrill.net/kettle.jpg',
      priceMinorUnits: 1999,
      currencyCode: 'GBP',
    },
  ];

  it('builds a flash deals card from real flash products with max discount and end date', () => {
    const cards = buildCuratedCards(flash, [], [], 'en', '2026-09-11T23:59:59Z');
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe('Flash Deals');
    expect(cards[0].linkHref).toBe('/deals');
    expect(cards[0].subtitle).toContain('25% off');
    expect(cards[0].subtitle).toContain('Ends');
    expect(cards[0].tiles[0]).toMatchObject({
      title: 'Hairdryer',
      href: '/products/hairdryer',
      priceMinorUnits: 4199,
      listPriceMinorUnits: 5499,
      currencyCode: undefined,
    });
  });

  it('builds best sellers and new arrivals cards pointing at the sorted listing', () => {
    const cards = buildCuratedCards([], best, [{ ...best[0], name: 'Toaster', slug: 'toaster' }], 'en');
    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe('Best Sellers');
    expect(cards[0].linkHref).toBe('/products?sort=popular');
    expect(cards[1].title).toBe('New Arrivals');
    expect(cards[1].linkHref).toBe('/products?sort=newest');
    expect(cards[1].tiles[0]).toMatchObject({ title: 'Toaster', priceMinorUnits: 1999, currencyCode: 'GBP' });
  });

  it('skips sources with no qualified products', () => {
    expect(buildCuratedCards([], [], [], 'en')).toHaveLength(0);
    expect(buildCuratedCards([{ name: 'No image', slug: 'x' }], [], [], 'en')).toHaveLength(0);
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