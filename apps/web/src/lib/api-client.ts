import { API_BASE } from './api';

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