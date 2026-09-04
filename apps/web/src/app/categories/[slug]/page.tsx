import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductListing, buildListingMetadata } from '@/components/commerce/ProductListing';
import { Banner } from '@/components/ui/Banner';
import { API_BASE } from '@/lib/api';

function prettify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchCategory(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/categories/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildListingMetadata(searchParams, { forceCategory: slug });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const data = await fetchCategory(slug);
  
  if (!data?.category) notFound();

  const { category } = data;
  const name = category.name || prettify(slug);
  const description = category.description;
  const sub = category.children || [];

  const hero = (
    <div className="relative mb-8 rounded-3xl overflow-hidden bg-white border border-border shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-ember/5 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-ember/10 to-transparent pointer-events-none" />
      <div className="relative px-8 py-10 md:px-12 md:py-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="max-w-2xl">
          <p className="text-ember text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ember animate-pulse" />
            Storegrill Department
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-4">{name}</h1>
          <p className="text-smoke-600 text-base md:text-lg leading-relaxed mb-8">
            {description ?? `Browse millions of items in ${name}. Verified sellers, fast regional shipping, and secure Stripe & PayPal checkout.`}
          </p>
          {sub.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {sub.map((s: any) => (
                <Link
                  key={s.slug}
                  href={`/products?category=${s.slug}`}
                  className="px-5 py-2 rounded-xl bg-surface-raised border border-border text-sm font-bold text-charcoal hover:border-ember hover:text-ember hover:shadow-md transition-all"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="hidden md:flex flex-col items-end shrink-0">
           <div className="flex gap-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-sunken border border-border flex items-center justify-center text-ember/60 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-surface-sunken border border-border flex items-center justify-center text-ember/60 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
           </div>
           <p className="text-xs font-semibold text-smoke-500 mt-3">Verified & Fast Shipping</p>
        </div>
      </div>
    </div>
  );

  return (
    <ProductListing
      searchParams={searchParams}
      forceCategory={slug}
      basePath={`/categories/${slug}`}
      breadcrumbItems={[{ name: 'Categories', path: '/categories' }, { name, path: '' }]}
      hero={hero}
    />
  );
}
