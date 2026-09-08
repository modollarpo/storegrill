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

export async function getRecentCategories(
  regionKey: string,
  offset = 0,
  opts: { signal?: AbortSignal } = {},
): Promise<RecentCategoriesPage> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/categories?sort=recent&includeProducts=true&offset=${offset}&limit=4&regionKey=${encodeURIComponent(regionKey)}`,
      { signal: opts.signal },
    );
    if (!response.ok) return { categories: [], hasMore: false };
    const data = (await response.json()) as RecentCategoriesPage;
    return { categories: data.categories ?? [], hasMore: Boolean(data.hasMore) };
  } catch {
    return { categories: [], hasMore: false };
  }
}