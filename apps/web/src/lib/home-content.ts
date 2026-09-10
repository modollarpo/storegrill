import { API_BASE } from './api';
import { translateBatch } from './server-translate';
import { t } from '@/i18n';
import { FALLBACK_HERO_DEALS } from './home-hero-fallback';
import {
  buildCategoryCards,
  buildCuratedCards,
  buildFeaturedSection,
  buildHeroSlides,
  buildPromos,
  buildRows,
  rowsFromCards,
  type CategoryRow,
  type CuratedProductRow,
  type DealRow,
  type HomeContent,
  type HomeGridSection,
  type HomeSectionItem,
} from './home-content-build';

async function fetchJson(url: string, revalidate: number): Promise<unknown> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchCategories(regionKey: string): Promise<CategoryRow[]> {
  const data = (await fetchJson(
    `${API_BASE}/api/v1/categories?includeProducts=true&featured=true&regionKey=${encodeURIComponent(regionKey)}`,
    60,
  )) as { categories?: CategoryRow[] } | null;
  return Array.isArray(data?.categories) ? data.categories : [];
}

async function fetchRecentCategories(regionKey: string, offset: number): Promise<{ categories: CategoryRow[]; hasMore: boolean }> {
  const data = (await fetchJson(
    `${API_BASE}/api/v1/categories?sort=recent&includeProducts=true&offset=${offset}&limit=4&regionKey=${encodeURIComponent(regionKey)}`,
    60,
  )) as { categories?: CategoryRow[]; hasMore?: boolean } | null;
  return {
    categories: Array.isArray(data?.categories) ? data.categories : [],
    hasMore: Boolean(data?.hasMore),
  };
}

async function fetchLiveDeals(regionKey: string): Promise<DealRow[]> {
  const data = (await fetchJson(
    `${API_BASE}/api/v1/deals?regionKey=${encodeURIComponent(regionKey)}`,
    60,
  )) as { deals?: DealRow[] } | null;
  const deals = Array.isArray(data?.deals) ? data.deals : [];
  return deals.filter(deal => deal?.enabled === true && deal?.status === 'LIVE');
}

async function fetchFlashProducts(regionKey: string): Promise<CuratedProductRow[]> {
  const data = (await fetchJson(
    `${API_BASE}/api/v1/deals/products?filter=flash&sort=savings&limit=4&regionKey=${encodeURIComponent(regionKey)}`,
    60,
  )) as { products?: CuratedProductRow[] } | null;
  return Array.isArray(data?.products) ? data.products : [];
}

async function fetchProducts(regionKey: string, sort: 'popular' | 'newest'): Promise<CuratedProductRow[]> {
  const data = (await fetchJson(
    `${API_BASE}/api/v1/products?sort=${sort}&limit=4&inStock=true&regionKey=${encodeURIComponent(regionKey)}`,
    60,
  )) as { products?: Array<Record<string, unknown>> } | null;
  return Array.isArray(data?.products)
    ? data.products.map(p => ({
        id: typeof p.id === 'string' ? p.id : undefined,
        slug: typeof p.slug === 'string' ? p.slug : null,
        name: typeof p.name === 'string' ? p.name : undefined,
        thumbnail: typeof p.thumbnail === 'string' ? p.thumbnail : null,
        priceMinorUnits: typeof p.price === 'number' ? p.price : null,
        listPriceMinorUnits: typeof p.listPriceMinorUnits === 'number' ? p.listPriceMinorUnits : null,
        currencyCode: typeof p.currencyCode === 'string' ? p.currencyCode : undefined,
      }))
    : [];
}

async function translateTitles(texts: string[], language: string): Promise<string[]> {
  if (!language || language === 'en' || texts.length === 0) return texts;
  const translated = await translateBatch(texts, language);
  return texts.map((text, i) => translated[i] || text);
}

async function translateCards(cards: HomeGridSection[], language: string): Promise<void> {
  if (!language || language === 'en' || cards.length === 0) return;
  const positions: Array<{ card: number; field: 'title' | 'subtitle' | 'tile'; tile?: number }> = [];
  const texts: string[] = [];
  cards.forEach((card, i) => {
    positions.push({ card: i, field: 'title' });
    texts.push(card.title);
    if (card.subtitle) {
      positions.push({ card: i, field: 'subtitle' });
      texts.push(card.subtitle);
    }
    card.tiles.forEach((tile, j) => {
      positions.push({ card: i, field: 'tile', tile: j });
      texts.push(tile.title);
    });
  });
  const translated = await translateTitles(texts, language);
  positions.forEach((pos, idx) => {
    const value = translated[idx];
    if (!value) return;
    if (pos.field === 'title') cards[pos.card].title = value;
    else if (pos.field === 'subtitle') cards[pos.card].subtitle = value;
    else cards[pos.card].tiles[pos.tile!].title = value;
  });
}

export async function loadHomeContent(regionKey: string, language: string): Promise<HomeContent> {
  const [roots, deals, recentPage, flash, bestSellers, newArrivals] = await Promise.all([
    fetchCategories(regionKey),
    fetchLiveDeals(regionKey),
    fetchRecentCategories(regionKey, 0),
    fetchFlashProducts(regionKey),
    fetchProducts(regionKey, 'popular'),
    fetchProducts(regionKey, 'newest'),
  ]);

  let slides = buildHeroSlides(deals, language);
  if (slides.length === 0) {
    slides = FALLBACK_HERO_DEALS.map(slide => ({ ...slide }));
  }
  if (language && language !== 'en' && slides.length > 0) {
    const names = await translateTitles(
      slides.map(slide => slide.title),
      language,
    );
    slides.forEach((slide, i) => {
      slide.title = names[i] ?? slide.title;
    });
  }

  const flashDeal = deals.find(d => d.type === 'FLASH_SALE');
  const curated = buildCuratedCards(flash, bestSellers, newArrivals, language, flashDeal?.endsAt);
  const cards = [...buildCategoryCards(roots, language), ...curated];
  await translateCards(cards, language);

  const featured = buildFeaturedSection(roots, deals, language, regionKey);
  if (featured && language && language !== 'en') {
    const texts = await translateTitles([featured.title, featured.subtitle ?? ''], language);
    featured.title = texts[0] || featured.title;
    if (featured.subtitle) featured.subtitle = texts[1] || featured.subtitle;
    featured.ctaText = t(language, 'homeFeaturedCta', featured.title);
  }
  const sections: HomeSectionItem[][] = [
    ...(featured ? [[featured] as HomeSectionItem[]] : []),
    ...buildRows(cards, buildPromos(language), language),
  ];

  const recentCards = buildCategoryCards(recentPage.categories, language).filter(card => card.tiles.length > 0);
  await translateCards(recentCards, language);
  const recent =
    recentCards.length > 0
      ? { rows: rowsFromCards(recentCards), hasMore: recentPage.hasMore, nextOffset: recentPage.categories.length }
      : undefined;

  return { heroSlides: slides, sections, recent };
}