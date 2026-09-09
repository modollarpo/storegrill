'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { t } from '@/i18n';

export interface DealProduct {
  id: string;
  slug: string;
  name: string;
  thumbnail?: string | null;
  priceMinorUnits: number;
  listPriceMinorUnits: number;
  discountPercent: number;
  currencyCode: string;
  dealLabel: string;
  endsAt?: string | null;
  dealId?: string | null;
  createdAt?: string;
  categorySlug?: string | null;
  vendorSlug?: string | null;
}

interface DealsCatalogClientProps {
  regionKey: string;
  language: string;
  initialProducts: DealProduct[];
  initialTotal: number;
  initialHasMore: boolean;
}

const FILTERS = ['all', 'flash', 'category', 'clearance'] as const;
const SORTS = ['savings', 'discountPercent', 'newest', 'price'] as const;

function labelChip(label: string): { text: string; className: string } {
  if (label === 'LIGHTNING') return { text: 'Lightning', className: 'bg-ember text-white' };
  if (label === 'CLEARANCE') return { text: 'Clearance', className: 'bg-amber-500 text-white' };
  if (label.endsWith('% OFF')) return { text: label, className: 'bg-deal text-white' };
  return { text: 'Save', className: 'bg-deal text-white' };
}

function DealCard({ product, language }: { product: DealProduct; language: string }) {
  const chip = labelChip(product.dealLabel);
  const fromNow = product.endsAt ? new Date(product.endsAt).getTime() - Date.now() : null;
  const endsIn =
    fromNow != null && fromNow > 0
      ? `${Math.ceil(fromNow / 360000)}h ${Math.ceil((fromNow % 360000) / 60000)}m`
      : null;
  return (
    <li>
      <Link href={`/products/${product.slug}`} className="group h-full block">
        <article className="h-full flex flex-col bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-ember transition-all duration-300">
          <div className="relative aspect-[4/3] w-full bg-surface-sunken overflow-hidden">
            {product.thumbnail ? (
              <Image
                src={product.thumbnail}
                alt={product.name}
                fill
                sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-raised">
                <span className="text-snow-300 text-sm font-bold">{chip.text}</span>
              </div>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-widest shadow-md ${chip.className}`}>
                {chip.text}
              </span>
            </div>
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-md bg-charcoal/90 text-white text-xs font-extrabold shadow-md">
                -{product.discountPercent}%
              </span>
            </div>
          </div>

          <div className="flex flex-col flex-1 p-5">
            <h3 className="text-base font-extrabold text-charcoal leading-snug mb-2 group-hover:text-ember transition-colors line-clamp-2">
              {product.name}
            </h3>
            <p className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-black text-sale">
                {formatPrice(product.priceMinorUnits, product.currencyCode)}
              </span>
              <span className="text-base font-semibold text-text-tertiary line-through">
                {formatPrice(product.listPriceMinorUnits, product.currencyCode)}
              </span>
            </p>
            {endsIn && (
              <p className="text-xs font-bold text-ember mb-2">{t(language, 'dealsEndsIn', endsIn)}</p>
            )}
            <div className="mt-auto">
              <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-deal rounded-full"
                  style={{ width: `${Math.min(95, product.discountPercent + 25)}%` }}
                />
              </div>
              <span className="flex items-center justify-center w-full h-10 rounded-xl bg-surface-raised text-charcoal font-bold text-sm border border-border group-hover:bg-charcoal group-hover:text-white transition-colors">
                {t(language, 'dealsView')}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </li>
  );
}

export function DealsCatalogClient({
  regionKey,
  language,
  initialProducts,
  initialTotal,
  initialHasMore,
}: DealsCatalogClientProps) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('savings');
  const [products, setProducts] = useState<DealProduct[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(initialProducts.length);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<{ products: DealProduct[]; total: number; hasMore: boolean }>(
      `/api/v1/deals/products?regionKey=${regionKey}&filter=${filter}&sort=${sort}&offset=0&limit=24`,
    )
      .then(data => {
        if (cancelled) return;
        setProducts(data.products);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setOffset(data.products.length);
      })
      .catch(() => {
        if (!cancelled) setError(t(language, 'dealsError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionKey, filter, sort, language]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const data = await api<{ products: DealProduct[]; total: number; hasMore: boolean }>(
        `/api/v1/deals/products?regionKey=${regionKey}&filter=${filter}&sort=${sort}&offset=${offset}&limit=24`,
      );
      setProducts(prev => [...prev, ...data.products]);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setOffset(prev => prev + data.products.length);
    } catch {
      setError(t(language, 'dealsError'));
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, regionKey, filter, sort, offset, language]);

  const sortLabel: Record<(typeof SORTS)[number], string> = {
    savings: t(language, 'dealsSortSavings'),
    discountPercent: t(language, 'dealsSortDiscount'),
    newest: t(language, 'dealsSortNewest'),
    price: t(language, 'dealsSortPrice'),
  };
  const filterLabel: Record<(typeof FILTERS)[number], string> = {
    all: t(language, 'dealsAll'),
    flash: t(language, 'dealsLightning'),
    category: t(language, 'dealsPercentOff'),
    clearance: t(language, 'dealsClearance'),
  };

  return (
    <div>
      <div className="sticky top-[73px] z-30 bg-surface border-b border-border shadow-sm mb-10 overflow-hidden">
        <div className="container-fluid flex items-center gap-4 py-4">
          <nav className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-charcoal text-white shadow-md'
                    : 'bg-surface-raised border border-border text-text-secondary hover:bg-surface-sunken hover:text-charcoal'
                }`}
              >
                {filterLabel[f]}
              </button>
            ))}
          </nav>
          <div className="ml-auto shrink-0 flex items-center gap-3">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t(language, 'dealsFound', total)}</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as (typeof SORTS)[number])}
              className="px-3 py-2 rounded-xl border border-border bg-surface-raised text-sm font-bold text-charcoal focus:outline-none"
            >
              {SORTS.map(s => (
                <option key={s} value={s}>
                  {sortLabel[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="container-fluid pb-20">
        {products.length === 0 && !loading ? (
          <div className="rounded-3xl border border-border bg-surface p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-surface-sunken rounded-full flex items-center justify-center mx-auto mb-6 text-smoke-400">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">{t(language, 'dealsNoResults')}</h2>
            <p className="text-smoke-500">{t(language, 'dealsNoResultsBody')}</p>
          </div>
        ) : (
          <div className="space-y-10">
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" role="list">
              {products.map(p => (
                <DealCard key={p.id} product={p} language={language} />
              ))}
            </ul>

            {error && (
              <p className="text-center text-smoke-600 font-semibold">{error}</p>
            )}

            {hasMore && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-10 py-4 rounded-2xl bg-charcoal text-white font-extrabold text-base hover:bg-ember transition-colors disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? t(language, 'dealsLoading') : t(language, 'dealsLoadMore')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}