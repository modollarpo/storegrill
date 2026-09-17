import { t } from '@/i18n';

export interface HomeCardTile {
  title: string;
  image: string;
  href: string;
  bgOverride?: string;
  priceMinorUnits?: number;
  currencyCode?: string;
  listPriceMinorUnits?: number;
}

export interface HomeGridSection {
  type?: 'grid';
  title: string;
  subtitle?: string;
  tiles: HomeCardTile[];
  linkText?: string;
  linkHref?: string;
  cardBg?: string;
}

export interface HomePromoSection {
  type: 'promo';
  title: string;
  subtitle?: string;
  eyebrow?: string;
  image?: string;
  bgClass?: string;
  textColor?: string;
  ctaText?: string;
  href: string;
  wide?: boolean;
  priceMinorUnits?: number;
  currencyCode?: string;
  listPriceMinorUnits?: number;
}

export interface HomeFeaturedProduct {
  title: string;
  image: string;
  href: string;
  priceMinorUnits?: number;
  currencyCode?: string;
  listPriceMinorUnits?: number;
  discountLabel?: string;
}

export interface HomeFeaturedSection {
  type: 'featured';
  eyebrow: string;
  title: string;
  subtitle?: string;
  href: string;
  ctaText: string;
  secondaryCtaText: string;
  secondaryHref: string;
  stats?: string[];
  products: HomeFeaturedProduct[];
}

export type HomeSectionItem = HomeGridSection | HomePromoSection | HomeFeaturedSection;

export interface HomeHeroSlide {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  priceMinorUnits?: number;
  currencyCode?: string;
  listPriceMinorUnits?: number;
  discountPercent?: number;
  overlayTint?: string;
  imageFit?: 'contain' | 'cover';
}

export interface DealVariantRow {
  product?: { thumbnail?: string | null; name?: string; slug?: string } | null;
  priceMinorUnits?: number | null;
  listPriceMinorUnits?: number | null;
  discountPercent?: number;
}

export interface DealRow {
  id?: string;
  status?: string;
  enabled?: boolean;
  slug?: string | null;
  name?: string;
  type?: string;
  endsAt?: string;
  variants?: DealVariantRow[];
}

export interface CuratedProductRow {
  id?: string;
  slug?: string | null;
  name?: string;
  thumbnail?: string | null;
  priceMinorUnits?: number | null;
  listPriceMinorUnits?: number | null;
  discountPercent?: number;
  endsAt?: string | null;
  currencyCode?: string;
}

export interface FeaturedRow {
  id?: string;
  name?: string;
  slug?: string;
  thumbnail?: string | null;
  price?: number;
  currencyCode?: string;
  listPriceMinorUnits?: number;
}

export interface CategoryRow {
  id?: string;
  name?: string;
  slug?: string;
  tagline?: string | null;
  featured?: FeaturedRow[];
}

export interface HomeRecentFeed {
  rows: HomeSectionItem[][];
  hasMore: boolean;
  nextOffset: number;
}

export interface HomeContent {
  heroSlides: HomeHeroSlide[];
  sections: HomeSectionItem[][];
  recent?: HomeRecentFeed;
}

export function endLabel(endsAt: string | undefined, language: string): string {
  if (!endsAt) return '';
  try {
    const d = new Date(endsAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(language === 'ar' ? 'ar-EG' : language, { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export const HERO_MAX_SLIDES = 20;

const CATEGORY_BANNERS: Array<{ slug: string; tagline: string; image: string }> = [
  { slug: 'furniture', tagline: 'Beds, desks, dining and living pieces for every room in the house.', image: '/banners/category/furniture.png' },
  { slug: 'outdoor', tagline: 'Grills, patio furniture and garden gear made for the outdoors.', image: '/banners/category/outdoor.png' },
  { slug: 'toys-hobbies', tagline: 'Play, learning and creative hobbies for kids of all ages.', image: '/banners/category/toys-hobbies.png' },
  { slug: 'baby-kids', tagline: 'Nurseries, toys and everyday essentials for growing families.', image: '/banners/category/baby-kids.png' },
  { slug: 'decor', tagline: 'Mirrors, lighting and accents that give every room its character.', image: '/banners/category/decor.png' },
  { slug: 'pets', tagline: 'Beds, feeders and supplies your cat, dog or small pet will love.', image: '/banners/category/pets.png' },
  { slug: 'sports', tagline: 'Exercise machines, yoga and gear for every kind of active day.', image: '/banners/category/sports.png' },
  { slug: 'bath', tagline: 'Cabinets, storage and fixtures to keep every washroom organised.', image: '/banners/category/bath.png' },
  { slug: 'appliances', tagline: 'Upgrade your home with the essentials that actually do the work.', image: '/banners/category/appliances.png' },
  { slug: 'kitchen', tagline: 'Cookware, organisers and storage for a kitchen that works.', image: '/banners/category/kitchen.png' },
  { slug: 'health-beauty', tagline: 'Wellness, massage and self-care for home and on the go.', image: '/banners/category/health-beauty.png' },
];

export function buildCategoryBannerSlides(): HomeHeroSlide[] {
  return CATEGORY_BANNERS.map(b => ({
    title: b.slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    subtitle: b.tagline,
    image: b.image,
    href: `/categories/${b.slug}`,
    imageFit: 'cover' as const,
  }));
}

export function buildHeroSlides(deals: DealRow[], language: string): HomeHeroSlide[] {
  const slides: HomeHeroSlide[] = [];
  const seen = new Set<string>();
  for (const deal of deals) {
    for (const variant of deal.variants ?? []) {
      if (slides.length >= HERO_MAX_SLIDES) break;
      const product = variant?.product;
      if (!product?.thumbnail || !product?.name) continue;
      const percent = Math.round(Number(variant.discountPercent));
      if (!Number.isFinite(percent) || percent < 1) continue;
      const key = product.slug ?? product.name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const ends = endLabel(deal.endsAt, language);
      const pctLabel = t(language, 'homePercentOff', percent);
      slides.push({
        title: product.name as string,
        subtitle: ends ? `${pctLabel} · ${t(language, 'homeEndsOn', ends)}` : pctLabel,
        image: product.thumbnail as string,
        href: `/deals/${deal.slug ?? deal.id ?? 'deals'}`,
        priceMinorUnits: variant.priceMinorUnits ?? undefined,
        currencyCode: 'GBP',
        listPriceMinorUnits: variant.listPriceMinorUnits ?? undefined,
        discountPercent: percent,
      });
    }
    if (slides.length >= HERO_MAX_SLIDES) break;
  }
  return slides.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
}

export interface HomeBannerSlide {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  imageFit?: 'contain' | 'cover';
  creativeId?: string;
}

export function mapBannerSlides(data: unknown): HomeHeroSlide[] {
  const rows = Array.isArray((data as { slides?: unknown })?.slides) ? (data as { slides: unknown[] }).slides : [];
  const slides: HomeHeroSlide[] = [];
  for (const entry of rows) {
    const banner = entry as Record<string, unknown>;
    if (typeof banner.title !== 'string' || typeof banner.image !== 'string' || typeof banner.href !== 'string') {
      continue;
    }
    if (!banner.href.startsWith('/') || banner.href.startsWith('//')) continue;
    slides.push({
      title: banner.title,
      subtitle: typeof banner.subtitle === 'string' ? banner.subtitle : '',
      image: banner.image,
      href: banner.href,
      imageFit: banner.imageFit === 'cover' ? 'cover' : 'contain',
    });
  }
  return slides.slice(0, HERO_MAX_SLIDES);
}

export function buildCategoryCards(roots: CategoryRow[], language: string): HomeGridSection[] {
  const cards: HomeGridSection[] = [];
  for (const root of roots) {
    if (!root.name || !root.slug) continue;
    const tiles = (root.featured ?? [])
      .filter(p => p?.name && p?.thumbnail && p?.slug)
      .slice(0, 4)
      .map(p => ({
        title: p.name as string,
        image: p.thumbnail as string,
        href: `/products/${p.slug as string}`,
        priceMinorUnits: p.price,
        currencyCode: p.currencyCode,
        listPriceMinorUnits: p.listPriceMinorUnits,
      }));
    if (tiles.length === 0) continue;
    cards.push({
      title: root.name as string,
      subtitle: root.tagline ?? undefined,
      tiles,
      linkText: t(language, 'homeSeeMore'),
      linkHref: `/categories/${root.slug as string}`,
    });
  }
  return cards;
}

export function buildCuratedCards(
  flash: CuratedProductRow[],
  bestSellers: CuratedProductRow[],
  newArrivals: CuratedProductRow[],
  language: string,
  flashEndsAt?: string | null,
): HomeGridSection[] {
  const cards: HomeGridSection[] = [];

  const flashTiles = curatedTiles(flash);
  if (flashTiles.length > 0) {
    const maxPercent = Math.max(0, ...flash.map(p => Math.round(Number(p.discountPercent) || 0)));
    const ends = flashEndsAt ? endLabel(flashEndsAt, language) : '';
    const subtitle = [
      maxPercent > 0 ? t(language, 'homePercentOffUpTo', maxPercent) : null,
      ends ? t(language, 'homeEndsOn', ends) : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;
    cards.push({
      title: t(language, 'homeFlashDealsTitle'),
      subtitle,
      tiles: flashTiles,
      linkText: t(language, 'homeSeeMore'),
      linkHref: '/deals',
      cardBg: 'bg-gradient-to-br from-ember-pale to-smoke-100',
    });
  }

  const bestSellerTiles = curatedTiles(bestSellers);
  if (bestSellerTiles.length > 0) {
    cards.push({
      title: t(language, 'homeBestSellersTitle'),
      tiles: bestSellerTiles,
      linkText: t(language, 'homeSeeMore'),
      linkHref: '/products?sort=popular',
    });
  }

  const newArrivalTiles = curatedTiles(newArrivals);
  if (newArrivalTiles.length > 0) {
    cards.push({
      title: t(language, 'homeNewArrivalsTitle'),
      tiles: newArrivalTiles,
      linkText: t(language, 'homeSeeMore'),
      linkHref: '/products?sort=newest',
    });
  }

  return cards;
}

function curatedTiles(items: CuratedProductRow[]): HomeCardTile[] {
  return items
    .filter(p => p?.name && p?.thumbnail && p?.slug)
    .slice(0, 4)
    .map(p => ({
      title: p.name as string,
      image: p.thumbnail as string,
      href: `/products/${p.slug as string}`,
      priceMinorUnits: p.priceMinorUnits ?? undefined,
      currencyCode: p.currencyCode,
      listPriceMinorUnits: p.listPriceMinorUnits ?? undefined,
    }));
}

export function buildPromos(language: string): HomePromoSection[] {
  return [
    {
      type: 'promo',
      title: t(language, 'homeCreativeSellTitle'),
      subtitle: t(language, 'homeCreativeSellBody'),
      eyebrow: t(language, 'homePromoSellEyebrow'),
      ctaText: t(language, 'homeCreativeSellCta'),
      href: '/sell',
      bgClass: 'bg-gradient-to-br from-ember-pale to-smoke-100',
    },
    {
      type: 'promo',
      title: t(language, 'homeCreativeCurrencyTitle'),
      subtitle: t(language, 'homeCreativeCurrencyBody'),
      eyebrow: t(language, 'homePromoRegionsEyebrow'),
      ctaText: t(language, 'homeCreativeCurrencyCta'),
      href: '/regions',
      bgClass: 'bg-neutral-900 text-white',
    },
  ];
}

function featuredProductPercent(p: FeaturedRow): number {
  if (!p?.listPriceMinorUnits || !p?.price || p.listPriceMinorUnits <= p.price) return 0;
  return Math.round((1 - p.price / p.listPriceMinorUnits) * 100);
}

export function isoWeek(now: Date): number {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.round(((d.getTime() - yearStart.getTime()) / 86400000 / 7) + 0.5);
}

export function featuredCursor(regionKey: string, length: number, now: Date = new Date()): number {
  if (length <= 0) return 0;
  const regionSeed = [...regionKey].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (regionSeed + isoWeek(now) * 7) % length;
}

export function buildFeaturedSection(
  roots: CategoryRow[],
  deals: DealRow[],
  language: string,
  regionKey: string,
  now: Date = new Date(),
): HomeFeaturedSection | null {
  const productTiles = (root: CategoryRow): HomeFeaturedProduct[] =>
    (root.featured ?? [])
      .filter(p => p?.name && p?.thumbnail && p?.slug)
      .slice(0, 16)
      .map(p => ({
        title: p.name as string,
        image: p.thumbnail as string,
        href: `/products/${p.slug as string}`,
        priceMinorUnits: p.price ?? undefined,
        currencyCode: p.currencyCode,
        listPriceMinorUnits: p.listPriceMinorUnits ?? undefined,
        discountLabel: featuredProductPercent(p) >= 1 ? t(language, 'homePercentOff', featuredProductPercent(p)) : undefined,
      }));

  const eligible = roots.filter(root => root?.name && root?.slug && productTiles(root).length > 0);
  if (eligible.length === 0) return null;
  const category = eligible[featuredCursor(regionKey, eligible.length, now)];
  const items = productTiles(category);

  const maxDiscount = Math.max(0, ...(category.featured ?? []).map(featuredProductPercent));
  const stats: string[] = [];
  if (maxDiscount >= 1 && items.length > 0) stats.push(t(language, 'homePercentOffUpTo', maxDiscount));
  if (deals.length > 0) stats.push(t(language, 'homeDealsLiveCount', deals.length));

  return {
    type: 'featured',
    eyebrow: t(language, 'homePromoFeaturedEyebrow'),
    title: category.name as string,
    subtitle: category.tagline ?? undefined,
    href: `/categories/${category.slug as string}`,
    ctaText: t(language, 'homeFeaturedCta', category.name as string),
    secondaryCtaText: t(language, 'homeDealsSeeAll'),
    secondaryHref: '/deals',
    stats: stats.length > 0 ? stats : undefined,
    products: items,
  };
}

export function rowsFromCards(cards: HomeGridSection[]): HomeSectionItem[][] {
  const rows: HomeSectionItem[][] = [];
  for (let i = 0; i < cards.length; i += 4) rows.push(cards.slice(i, i + 4));
  return rows;
}

export function buildRows(cards: HomeGridSection[], promos: HomePromoSection[], _language: string): HomeSectionItem[][] {
  if (cards.length === 0) return promos.length > 0 ? [promos] : [];

  const promoSeats = Math.min(promos.length, cards.length);
  const promoRowCats = cards.slice(cards.length - promoSeats);
  const head = cards.slice(0, cards.length - promoSeats);

  const rows: HomeSectionItem[][] = [];
  for (let i = 0; i < head.length; i += 4) rows.push(head.slice(i, i + 4));
  const lastRow = [...promoRowCats, ...promos].slice(0, 4);
  if (lastRow.length > 0) rows.push(lastRow);
  return rows;
}