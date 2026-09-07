import { t } from '@/i18n';

export interface HomeCardTile {
  title: string;
  image: string;
  href: string;
  bgOverride?: string;
}

export interface HomeGridSection {
  type?: 'grid';
  title: string;
  tiles: HomeCardTile[];
  linkText?: string;
  linkHref?: string;
  cardBg?: string;
}

export interface HomePromoSection {
  type: 'promo';
  title: string;
  subtitle?: string;
  image?: string;
  bgClass?: string;
  textColor?: string;
  ctaText?: string;
  href: string;
}

export type HomeSectionItem = HomeGridSection | HomePromoSection;

export interface HomeHeroSlide {
  title: string;
  subtitle: string;
  image: string;
  href: string;
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
  endsAt?: string;
  variants?: DealVariantRow[];
}

export interface FeaturedRow {
  id?: string;
  name?: string;
  slug?: string;
  thumbnail?: string | null;
}

export interface CategoryRow {
  id?: string;
  name?: string;
  slug?: string;
  featured?: FeaturedRow[];
}

export interface HomeContent {
  heroSlides: HomeHeroSlide[];
  sections: HomeSectionItem[][];
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

export function buildHeroSlides(deals: DealRow[], language: string): HomeHeroSlide[] {
  const slides: HomeHeroSlide[] = [];
  for (const deal of deals) {
    if (slides.length >= 3) break;
    const variant = (deal.variants ?? []).find(
      v => v?.product?.thumbnail && v?.product?.name && Number(v.discountPercent) >= 1,
    );
    if (!variant?.product) continue;
    const percent = Math.round(Number(variant.discountPercent));
    const ends = endLabel(deal.endsAt, language);
    const pctLabel = t(language, 'homePercentOff', percent);
    slides.push({
      title: variant.product.name as string,
      subtitle: ends ? `${pctLabel} · ${t(language, 'homeEndsOn', ends)}` : pctLabel,
      image: variant.product.thumbnail as string,
      href: `/deals/${deal.slug ?? deal.id ?? 'deals'}`,
    });
  }
  return slides;
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
      }));
    if (tiles.length === 0) continue;
    cards.push({
      title: root.name as string,
      tiles,
      linkText: t(language, 'homeSeeMore'),
      linkHref: `/categories/${root.slug as string}`,
    });
  }
  return cards;
}

export function buildPromos(language: string): HomePromoSection[] {
  return [
    {
      type: 'promo',
      title: t(language, 'homeCreativeSellTitle'),
      subtitle: t(language, 'homeCreativeSellBody'),
      ctaText: t(language, 'homeCreativeSellCta'),
      href: '/sell',
      bgClass: 'bg-gradient-to-br from-ember-pale to-smoke-100',
    },
    {
      type: 'promo',
      title: t(language, 'homeCreativeCurrencyTitle'),
      subtitle: t(language, 'homeCreativeCurrencyBody'),
      ctaText: t(language, 'homeCreativeCurrencyCta'),
      href: '/regions',
      bgClass: 'bg-neutral-900 text-white',
    },
  ];
}

export function buildRows(cards: HomeGridSection[], promos: HomePromoSection[]): HomeSectionItem[][] {
  const promoSeats = Math.min(promos.length, cards.length);
  const promoRowCats = cards.slice(cards.length - promoSeats);
  const head = cards.slice(0, cards.length - promoSeats);

  const rows: HomeSectionItem[][] = [];
  for (let i = 0; i < head.length; i += 4) {
    rows.push(head.slice(i, i + 4));
  }
  const lastRow = [...promoRowCats, ...promos].slice(0, 4);
  if (lastRow.length > 0) rows.push(lastRow);
  return rows;
}