import { createHash } from 'crypto';
import { prisma } from '../index.js';

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://localhost:5001';
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || '';
const BATCH_SIZE = 40;
const MAX_TEXT_LENGTH = 5000;
const REQUEST_TIMEOUT_MS = 15000;

export const SUPPORTED_LANGUAGES = new Set(['en', 'de', 'fr', 'es', 'it', 'ar', 'hi', 'pt']);

function hashText(text: string, source: string, target: string): string {
  return createHash('sha256').update(`${source}:${target}:${text}`).digest('hex');
}

interface LibreTranslateResponse {
  translatedText: string;
}

async function callLibreTranslate(texts: string[], source: string, target: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        q: texts,
        source,
        target,
        format: 'text',
        ...(LIBRETRANSLATE_API_KEY ? { api_key: LIBRETRANSLATE_API_KEY } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`LibreTranslate responded ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return (data as LibreTranslateResponse[]).map(d => d.translatedText);
    }
    return [(data as LibreTranslateResponse).translatedText];
  } finally {
    clearTimeout(timeout);
  }
}

export interface TranslationResult {
  translations: string[];
  cachedCount: number;
  providerUsed: boolean;
}

export async function translateBatch(
  texts: string[],
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult> {
  const unique = [...new Set(texts.filter(t => t && t.trim().length > 0))];
  if (unique.length === 0) {
    return { translations: texts, cachedCount: 0, providerUsed: false };
  }

  if (sourceLang === targetLang || !SUPPORTED_LANGUAGES.has(targetLang)) {
    return { translations: texts, cachedCount: unique.length, providerUsed: false };
  }

  const hashes = new Map(unique.map(text => [hashText(text.slice(0, MAX_TEXT_LENGTH), sourceLang, targetLang), text]));
  const cached = await prisma.translationCache.findMany({
    where: { hash: { in: [...hashes.keys()] } },
  });

  const byHash = new Map(cached.map(c => [c.hash, c.translatedText]));
  const misses: string[] = [];
  for (const [hash, text] of hashes) {
    if (!byHash.has(hash)) misses.push(text);
  }

  let providerUsed = false;
  if (misses.length > 0) {
    try {
      for (let i = 0; i < misses.length; i += BATCH_SIZE) {
        const batch = misses.slice(i, i + BATCH_SIZE).map(t => t.slice(0, MAX_TEXT_LENGTH));
        const translated = await callLibreTranslate(batch, sourceLang, targetLang);
        providerUsed = true;
        await prisma.$transaction(
          batch.map((original, idx) =>
            prisma.translationCache.upsert({
              where: { hash: hashText(original, sourceLang, targetLang) },
              update: { translatedText: translated[idx] ?? original },
              create: {
                hash: hashText(original, sourceLang, targetLang),
                sourceLang,
                targetLang,
                sourceText: original,
                translatedText: translated[idx] ?? original,
              },
            })
          )
        );
        batch.forEach((original, idx) => {
          byHash.set(hashText(original, sourceLang, targetLang), translated[idx] ?? original);
        });
      }
    } catch (error) {
      console.error('[i18n] LibreTranslate unavailable, serving originals:', error instanceof Error ? error.message : error);
      for (const text of misses) {
        byHash.set(hashText(text.slice(0, MAX_TEXT_LENGTH), sourceLang, targetLang), text);
      }
    }
  }

  return {
    translations: texts.map(text => {
      if (!text || !text.trim()) return text;
      const key = hashText(text.slice(0, MAX_TEXT_LENGTH), sourceLang, targetLang);
      return byHash.get(key) ?? text;
    }),
    cachedCount: cached.length,
    providerUsed,
  };
}

const HTML_TAG_RE = /<[^>]+>/g;

export function stripHtml(text: string): string {
  return text.replace(HTML_TAG_RE, ' ').replace(/\s+/g, ' ').trim();
}
