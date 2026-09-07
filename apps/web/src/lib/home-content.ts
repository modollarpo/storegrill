import { API_BASE } from './api';
import { translateBatch } from './server-translate';
import {
  buildCategoryCards,
  buildHeroSlides,
  buildPromos,
  buildRows,
  type CategoryRow,
  type DealRow,
  type HomeContent,
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
    3600,
  )) as { categories?: CategoryRow[] } | null;
  return Array.isArray(data?.categories) ? data.categories : [];
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

export async function loadHomeContent(regionKey: string, language: string): Promise<HomeContent> {
  const [roots, deals] = await Promise.all([fetchCategories(regionKey), fetchLiveDeals(regionKey)]);

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
  if (language && language !== 'en' && cards.length > 0) {
    const texts = cards.flatMap(card => [card.title, ...card.tiles.map(tile => tile.title)]);
    const translated = await translateTitles(texts, language);
    let k = 0;
    for (const card of cards) {
      card.title = translated[k++] ?? card.title;
      for (const tile of card.tiles) {
        tile.title = translated[k++] ?? tile.title;
      }
    }
  }

  const sections = buildRows(cards, buildPromos(language));
  return { heroSlides: slides, sections };
}