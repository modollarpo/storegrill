import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { getRequestContext } from '@/lib/server-context';
import { localizeProducts } from '@/lib/server-translate';
import { buildMetadata, SEO_DEFAULTS } from '@/lib/seo';
import { API_BASE } from '@/lib/api';
import { FilterPanel, MobileFilterButton, ActiveFilterChips, SortDropdown } from '@/components/search/FilterPanel';
import type { ProductCardData } from '@/components/commerce/ProductCard';
import { ProductListingViews } from '@/components/commerce/ProductListingViews';
import { Pagination } from '@/components/navigation/Pagination';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';

export interface ListingSearchParams {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const FACET_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Computers & Accessories', slug: 'computers' },
  { name: 'Home & Kitchen', slug: 'home' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Beauty & Personal Care', slug: 'beauty' },
  { name: 'Sports & Outdoors', slug: 'sports' },
  { name: 'Books', slug: 'books' },
];

function single(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function prettify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export async function buildListingMetadata(
  searchParams: ListingSearchParams['searchParams'],
  opts: { forceCategory?: string } = {},
): Promise<Metadata> {
  const sp = (await searchParams) || {};
  const { regionKey } = await getRequestContext();
  const q = single(sp.q);
  const category = opts.forceCategory ?? single(sp.category);

  let title: string;
  let description: string;
  let path: string;
  if (q) {
    title = `${q} — Search Results`;
    description = SEO_DEFAULTS.search(q).description;
    path = `/search?q=${encodeURIComponent(q)}`;
  } else if (category) {
    const name = prettify(category);
    title = `${name} — Shop ${name} on Storegrill`;
    description = `Browse ${name} on Storegrill. Compare prices from verified sellers, read reviews and enjoy secure checkout with regional delivery.`;
    path = `/categories/${category}`;
  } else {
    title = 'All Products';
    description = 'Browse all products on Storegrill with filters for price, rating, brand and seller.';
    path = '/products';
  }

  return buildMetadata({ title, description, path, regionKey, noIndex: Boolean(q) });
}

async function fetchListing(
  sp: Record<string, string | string[] | undefined>,
  regionKey: string,
  forceCategory?: string,
) {
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
  const category = forceCategory ?? single(sp.category);
  if (category) params.set('category', category);
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

export interface ProductListingProps {
  searchParams?: ListingSearchParams['searchParams'];
  forceCategory?: string;
  breadcrumbItems?: { name: string; path: string }[];
  hero?: ReactNode;
  headingOverride?: string;
  basePath?: string;
}

export async function ProductListing({
  searchParams,
  forceCategory,
  breadcrumbItems,
  hero,
  headingOverride,
  basePath = '/products',
}: ProductListingProps) {
  const sp = (await searchParams) || {};
  const { regionKey, language } = await getRequestContext();
  const data = await fetchListing(sp, regionKey, forceCategory);
  const products = (Array.isArray(data.products) ? data.products : []) as ProductCardData[];
  const localized = (await localizeProducts(products, language)) as Array<ProductCardData & { category?: { id?: string } | null }>;
  const localizedWithCategory = localized.map(p => ({ ...p, categoryId: p.categoryId ?? p.category?.id }));
  const pagination = data.pagination ?? { page: 1, totalPages: 0, total: 0 };

  const q = single(sp.q);
  const effectiveCategory = forceCategory ?? single(sp.category);
  const heading =
    headingOverride ??
    (q ? `Results for “${q}”` : effectiveCategory ? prettify(effectiveCategory) : 'All Products');
  const currencyCode = localized[0]?.currencyCode || 'USD';
  const currencySymbol =
    new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value || '';
  const realMax = Math.max(0, ...localized.map(p => Number(p.price) || 0));
  const step = realMax < 10000 ? 1000 : realMax < 100000 ? 10000 : 100000;
  const maxPriceMinorUnits = realMax > 0 ? Math.ceil((realMax + 1) / step) * step : 10000;

  const facets = {
    categories: FACET_CATEGORIES,
    brands: [...new Set(products.map(p => p.vendor?.storeName).filter((v): v is string => Boolean(v)))].slice(0, 12),
    vendors: [...new Map(products.filter(p => p.vendor).map(p => [p.vendor!.slug, { id: p.vendor!.slug, name: p.vendor!.storeName }])).values()],
    maxPriceMinorUnits,
    currencySymbol,
  };

  function makeHref(page: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (key === 'page') continue;
      if (Array.isArray(value)) value.forEach(v => next.append(key, v));
      else if (value) next.set(key, String(value));
    }
    next.set('page', String(page));
    const base = q ? '/search' : basePath;
    return `${base}?${next.toString()}`;
  }

  const HeadingTag = hero ? 'h2' : 'h1';

  return (
    <div className="container-site py-10 md:py-16">
      <Breadcrumb
        items={breadcrumbItems ?? (heading !== 'All Products' ? [{ name: heading, path: '' }] : [])}
        regionKey={regionKey}
      />

      {hero}

      <div className="flex gap-10 mt-10">
        <aside className="hidden lg:block w-72 shrink-0 rounded-2xl bg-surface border border-border p-6 shadow-sm" aria-label="Filters">
          <Suspense fallback={<div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-surface-raised animate-shimmer" />)}</div>}>
            <FilterPanel facets={facets} />
          </Suspense>
        </aside>

        <section aria-label="Search results" className="flex-1 min-w-0">
          <div className="mb-6 flex items-center justify-between lg:hidden bg-surface border border-border rounded-xl p-4 shadow-sm">
            <MobileFilterButton facets={facets} />
            <span className="text-sm font-medium text-text-secondary">{pagination.total?.toLocaleString?.() ?? 0} results</span>
          </div>
          <header className="flex flex-wrap items-center gap-6 mb-10 bg-surface border border-border rounded-xl p-5 shadow-sm">
            <HeadingTag className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">{heading}</HeadingTag>
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
              <ProductListingViews products={localizedWithCategory} locale={language} key={`${regionKey}-${language}`} />
              <Pagination page={pagination.page} totalPages={pagination.totalPages} makeHref={makeHref} />
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
