import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { buildMetadata, SEO_DEFAULTS } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { FilterPanel, MobileFilterButton, ActiveFilterChips, SortDropdown } from '@/components/search/FilterPanel';
import type { ProductCardData } from '@/components/commerce/ProductCard';
import { ProductListingViews } from '@/components/commerce/ProductListingViews';
import { Pagination } from '@/components/navigation/Pagination';
import { SkeletonProductGrid } from '@/components/ui/Skeleton';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';



interface ListingProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function single(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export async function generateMetadata({ searchParams }: ListingProps): Promise<Metadata> {
  const sp = (await searchParams) || {};
  const { regionKey } = await getRequestContext();
  const q = single(sp.q);
  const category = single(sp.category);

  let title: string;
  let description: string;
  let path: string;
  if (q) {
    title = `${q} — Search Results`;
    description = SEO_DEFAULTS.search(q).description;
    path = `/search?q=${encodeURIComponent(q)}`;
  } else if (category) {
    title = `${category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Products`;
    description = `Browse ${category.replace(/-/g, ' ')} products from verified vendors on Storegrill. Compare prices and buy securely.`;
    path = `/products?category=${category}`;
  } else {
    title = 'All Products';
    description = 'Browse all products on Storegrill with filters for price, rating, brand and seller.';
    path = '/products';
  }

  const meta = buildMetadata({ title, description, path, regionKey, noIndex: Boolean(q) });
  return meta;
}

async function fetchListing(sp: Record<string, string | string[] | undefined>, regionKey: string) {
  const params = new URLSearchParams();
  params.set('regionKey', regionKey);
  const map: Record<string, string> = {
    q: 'q', category: 'category', min: 'minPrice', max: 'maxPrice',
    sort: 'sort', page: 'page',
  };
  for (const [local, remote] of Object.entries(map)) {
    const value = single(sp[local]);
    if (value) params.set(remote, value);
  }
  const rating = single(sp.rating);
  if (rating) params.set('minRating', rating);
  params.set('limit', '24');

  const brands = sp.brand;
  if (brands && !Array.isArray(brands)) params.set('brandId', brands);
  const vendors = sp.vendor;
  if (vendors && !Array.isArray(vendors)) params.set('vendorId', vendors);

  try {
    const res = await fetch(`${API_BASE}/api/v1/products?${params.toString()}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return { products: [], pagination: { page: 1, total: 0, totalPages: 0 }, ok: false };
  }
}

const FACET_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Computers & Accessories', slug: 'computers' },
  { name: 'Home & Kitchen', slug: 'home' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Beauty & Personal Care', slug: 'beauty' },
  { name: 'Sports & Outdoors', slug: 'sports' },
  { name: 'Books', slug: 'books' },
];

export default async function ListingPage({ searchParams }: ListingProps) {
  const sp = (await searchParams) || {};
  const { regionKey, language } = await getRequestContext();
  const data = await fetchListing(sp, regionKey);
  const products = (Array.isArray(data.products) ? data.products : []) as ProductCardData[];
  const localized = (await localizeProducts(products, language)) as ProductCardData[];
  const pagination = data.pagination ?? { page: 1, totalPages: 0, total: 0 };

  const q = single(sp.q);
  const heading = q ? `Results for “${q}”` : single(sp.category)?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'All Products';
  const facets = {
    categories: FACET_CATEGORIES,
    brands: [...new Set(products.map(p => p.vendor?.storeName).filter((v): v is string => Boolean(v)))].slice(0, 12),
    vendors: [...new Map(products.filter(p => p.vendor).map(p => [p.vendor!.slug, { id: p.vendor!.slug, name: p.vendor!.storeName }])).values()],
    maxPriceMinorUnits: 100000000,
    currencySymbol: '',
  };

  function makeHref(page: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (key === 'page') continue;
      if (Array.isArray(value)) value.forEach(v => next.append(key, v));
      else if (value) next.set(key, String(value));
    }
    next.set('page', String(page));
    const base = q ? '/search' : '/products';
    return `${base}?${next.toString()}`;
  }

  return (
    <div className="container-site py-4">
      <Breadcrumb items={[{ name: 'Products', path: '/products' }, ...(heading !== 'All Products' ? [{ name: heading, path: '' }] : [])]} regionKey={regionKey} />

      <div className="flex gap-6">
        <aside className="hidden lg:block w-72 shrink-0" aria-label="Filters">
          <Suspense fallback={<div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-md bg-surface-raised animate-shimmer" />)}</div>}>
            <FilterPanel
              facets={facets}
            />
          </Suspense>
        </aside>

        <section aria-label="Search results" className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <MobileFilterButton facets={facets} />
            <span className="text-sm text-text-secondary">{pagination.total?.toLocaleString?.() ?? 0} results</span>
          </div>
          <header className="flex flex-wrap items-center gap-4 mb-6">
            <h1 className="text-heading-lg font-bold text-text-primary">{heading}</h1>
            <span className="text-sm font-medium text-text-secondary order-last md:order-none md:ml-auto" role="status">
              Showing {localized.length > 0 ? ((pagination.page - 1) * 24) + 1 : 0}–{((pagination.page - 1) * 24) + localized.length} of{' '}
              {pagination.total?.toLocaleString?.() ?? pagination.total ?? 0} results
            </span>
            <Suspense fallback={null}>
              <SortDropdown />
            </Suspense>
          </header>

          <Suspense fallback={null}>
            <ActiveFilterChips />
          </Suspense>

          {localized.length === 0 ? (
            <EmptyState query={q} />
          ) : (
            <>
              <ProductListingViews products={localized} locale={language} key={`${regionKey}-${language}`} />
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                makeHref={makeHref}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ query }: { query?: string }) {
  return (
    <div className="card border border-border bg-surface-sunken p-16 text-center rounded-xl shadow-sm" data-testid="empty-results">
      <svg className="w-16 h-16 mx-auto text-text-tertiary mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <h2 className="text-xl font-bold text-text-primary">No results found{query ? ` for “${query}”` : ''}</h2>
      <p className="text-sm text-text-secondary mt-2">Try checking your spelling or use more general terms.</p>
      
      <div className="mt-8 pt-8 border-t border-border">
        <p className="text-xs text-text-tertiary font-bold uppercase tracking-wider mb-4">Popular right now</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {['headphones', 'smart watch', 'coffee maker', 'running shoes'].map(term => (
            <a key={term} href={`/search?q=${encodeURIComponent(term)}`} className="px-4 py-1.5 rounded-pill bg-surface border border-border text-xs font-bold text-text-primary hover:text-action-primary hover:border-action-primary transition-colors shadow-sm">
              {term}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
