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
  type HomePromoSection,
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
          { id: 'p1', name: 'Kettle', slug: 'kettle', thumbnail: 'https://cdn.storegrill.net/kettle.jpg', priceMinorUnits: 1999, currencyCode: 'GBP', listPriceMinorUnits: 2999 },
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

  it('inserts a full-width real content promo every third card row', () => {
    const cards = [
      card('C1'), card('C2'), card('C3'), card('C4'),
      card('C5'), card('C6'), card('C7'), card('C8'),
      card('C9'), card('C10'), card('C11'), card('C12'),
      card('C13'),
    ];
    const rows = buildRows(cards, buildPromos('en'), 'en');
    const wide = rows.find(row => row[0]?.type === 'promo' && row[0].wide === true);
    expect(wide).toBeDefined();
    expect(wide).toHaveLength(1);
    expect(rows.some(row => row.length > 1)).toBe(true);
  });

  it('builds the wide promo from the row category real data with a real price', () => {
    const priced: HomeGridSection = {
      title: 'Outdoor',
      subtitle: 'Grills and patio gear for the outdoors.',
      tiles: [{
        title: 'Gas Grill',
        image: 'https://cdn.storegrill.net/grill.jpg',
        href: '/products/gas-grill',
        priceMinorUnits: 15999,
        currencyCode: 'GBP',
        listPriceMinorUnits: 19999,
      }],
    };
    const cards = [...Array(13)].map((_, i) => card(`C${i + 1}`));
    cards[8] = priced;
    const rows = buildRows(cards, buildPromos('en'), 'en');
    const promoRow = rows.find(row => row[0]?.type === 'promo' && row[0].wide === true);
    const promo = promoRow?.[0] as HomePromoSection;
    expect(promo).toBeDefined();
    expect(promo.type).toBe('promo');
    expect(promo.wide).toBe(true);
    expect(promo.title).toBe('Outdoor');
    expect(promo.image).toBe('https://cdn.storegrill.net/grill.jpg');
    expect(promo.priceMinorUnits).toBe(15999);
    expect(promo.listPriceMinorUnits).toBe(19999);
    expect(promo.href).toBe('/products/gas-grill');
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