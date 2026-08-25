import { unstable_cache } from 'next/cache';
import { API_BASE } from './api';

interface TranslateResponse {
  translations: string[];
}

async function translateBatchUncached(texts: string[], targetLang: string): Promise<string[]> {
  if (!targetLang || targetLang === 'en') return texts;

  try {
    const res = await fetch(`${API_BASE}/api/v1/i18n/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, sourceLang: 'en', targetLang }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return texts;
    const data = (await res.json()) as TranslateResponse;
    return data.translations?.length === texts.length ? data.translations : texts;
  } catch {
    return texts;
  }
}

export const translateBatch = unstable_cache(
  async (texts: string[], targetLang: string): Promise<string[]> => translateBatchUncached(texts, targetLang),
  ['Storegrill-i18n'],
  { revalidate: 86400 }
);

export interface TranslatableProduct {
  name: string;
  description?: string;
  shortDescription?: string;
  category?: { name?: string } | null;
}

export async function localizeProducts<T extends TranslatableProduct>(
  products: T[],
  language: string
): Promise<T[]> {
  if (!language || language === 'en' || products.length === 0) return products;

  const texts = products.flatMap(p =>
    [p.name, p.description || '', p.shortDescription || '', p.category?.name || ''].map(t => t.slice(0, 2000))
  );
  const translated = await translateBatch(texts, language);

  return products.map((p, i) => {
    const base = i * 4;
    return {
      ...p,
      name: translated[base] || p.name,
      description: translated[base + 1] || p.description,
      shortDescription: translated[base + 2] || p.shortDescription,
      category: p.category ? { ...p.category, name: translated[base + 3] || p.category.name } : p.category,
    };
  });
}
