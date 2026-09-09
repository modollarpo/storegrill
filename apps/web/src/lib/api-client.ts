import { API_BASE } from './api';
import type { CategoryRow } from '@/lib/home-content-build';
import type { HomeFeed } from '@Storegrill/shared';

export interface FeaturedProduct {
  id: string;
  name: string;
  thumbnail?: string;
  price: number;
  currencyCode: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: CategoryNode[];
  featured?: FeaturedProduct[];
}

export async function getCategories(regionKey = 'UK'): Promise<CategoryNode[]> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/categories?includeProducts=true&regionKey=${regionKey}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

export async function getHomeFeed(
  regionKey: string,
  page = 0,
  opts: { signal?: AbortSignal } = {},
): Promise<HomeFeed | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/home?regionKey=${encodeURIComponent(regionKey)}&page=${page}`,
      { signal: opts.signal },
    );
    if (!response.ok) return null;
    return (await response.json()) as HomeFeed;
  } catch {
    return null;
  }
}

export interface RecentCategoriesPage {
  categories: CategoryRow[];
  hasMore: boolean;
}

const RECENT_CACHE_TTL_MS = 60_000;
const recentCache = new Map<string, { expiresAt: number; data: RecentCategoriesPage }>();
const recentInFlight = new Map<string, Promise<RecentCategoriesPage>>();

export async function getRecentCategories(
  regionKey: string,
  offset = 0,
  opts: { signal?: AbortSignal } = {},
): Promise<RecentCategoriesPage> {
  const cacheKey = `${regionKey}:${offset}`;
  const cached = recentCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const pending = recentInFlight.get(cacheKey);
  if (pending) return pending;

  const promise = fetchRecentCategories(regionKey, offset, cacheKey, opts.signal);
  recentInFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    recentInFlight.delete(cacheKey);
  }
}

async function fetchRecentCategories(
  regionKey: string,
  offset: number,
  cacheKey: string,
  signal?: AbortSignal,
): Promise<RecentCategoriesPage> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/categories?sort=recent&includeProducts=true&offset=${offset}&limit=4&regionKey=${encodeURIComponent(regionKey)}`,
      { signal },
    );
    if (!response.ok) return { categories: [], hasMore: false };
    const data = (await response.json()) as RecentCategoriesPage;
    const page = { categories: data.categories ?? [], hasMore: Boolean(data.hasMore) };
    if (!signal?.aborted) {
      recentCache.set(cacheKey, { expiresAt: Date.now() + RECENT_CACHE_TTL_MS, data: page });
      if (recentCache.size > 100) {
        const oldest = recentCache.keys().next().value;
        if (oldest) recentCache.delete(oldest);
      }
    }
    return page;
  } catch {
    return { categories: [], hasMore: false };
  }
}