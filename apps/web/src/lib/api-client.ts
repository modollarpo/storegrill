import { API_BASE } from './api';
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