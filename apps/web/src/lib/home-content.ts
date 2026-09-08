import { API_BASE } from './api';
import { translateBatch } from './server-translate';
import {
  buildCategoryCards,
  buildHeroSlides,
  buildPromos,
  buildRows,
  rowsFromCards,
  type CategoryRow,
  type DealRow,
  type HomeContent,
  type HomeGridSection,
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
  const [roots, deals, recentPage] = await Promise.all([
    fetchCategories(regionKey),
    fetchLiveDeals(regionKey),
    fetchRecentCategories(regionKey, 0),
  ]);

  const slides = buildHeroSlides(deals, language);
  if (language && language !== 'en' && slides.length > 0) {
    const names = await translateTitles(
      slides.map(slide => slide.title),
      language,
    );
    slides.forEach((slide, i) => {
      slide.title = names[i] ?? slide.title;
    });
  }

  const cards = buildCategoryCards(roots, language);
  await translateCards(cards, language);
  const sections = buildRows(cards, buildPromos(language), language);

  const recentCards = buildCategoryCards(recentPage.categories, language).filter(card => card.tiles.length > 0);
  await translateCards(recentCards, language);
  const recent =
    recentCards.length > 0
      ? { rows: rowsFromCards(recentCards), hasMore: recentPage.hasMore, nextOffset: recentPage.categories.length }
      : undefined;

  return { heroSlides: slides, sections, recent };
}