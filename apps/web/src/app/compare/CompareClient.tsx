'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCompareStore, MAX_COMPARE } from '@/store/useCompareStore';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import { storefrontImage } from '@/lib/images';
import { api, isApiError } from '@/lib/api';
import { useRegion } from '@/components/providers/RegionContext';
import { t } from '@/i18n';

interface CompareProduct {
  id: string;
  name: string;
  slug?: string;
  images?: string[];
  thumbnail?: string;
  basePriceMinorUnits?: number;
  currencyCode?: string;
  regionPrices?: Array<{ priceMinorUnits: number; currencyCode: string }>;
  rating?: number;
  reviewCount?: number;
  brand?: { name?: string } | null;
  vendor?: { storeName?: string; slug?: string } | null;
  inStock?: boolean;
}

type LoadState = 'loading' | 'ready' | 'partial';

function normalizeProductIds(productIds: string[]): string[] {
  const ids = new Set(productIds.map(id => String(id).trim()).filter(id => id.length > 0));
  return Array.from(ids).slice(0, MAX_COMPARE);
}

export function CompareClient({ regionKey }: { regionKey: string }) {
  const { productIds, removeProduct, clearCompare } = useCompareStore();
  const { language } = useRegion();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      const ids = normalizeProductIds(productIds);

      if (ids.length === 0) {
        setProducts([]);
        setUnavailableIds[];
        setLoadState('ready');
        return;
      }

      setLoadState('loading');
      const results = await Promise.all(
        ids.map(async id => {
          try {
            return await api<CompareProduct>(`/api/v1/products/${id}?regionKey=${regionKey}`);
          } catch (error) {
            // A single delisted product must not empty the whole comparison, but
            // the shopper has to be told the column is not coming.
            if (!isApiError(error) || error.status !== 404) {
              console.error(`compare: failed to load product ${id}`, error);
            }
            return null;
          }
        })
      );

      if (cancelled) return;
      const loaded = results.filter((product): product is CompareProduct => product !== null);
      setProducts(loaded);
      setUnavailableIds(productIds.filter((_, index) => results[index] === null));
      setLoadState(loaded.length === ids.length ? 'ready' : 'partial');
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, [productIds, regionKey]);

  const emptyColumns = Math.max(0, MAX_COMPARE - products.length);
  const isEmpty = loadState !== 'loading' && products.length === 0;

  return (
    <div className="bg-surface-sunken min-h-screen pb-24">
      <div className="bg-surface border-b border-border mb-8 shadow-sm">
        <div className="container-fluid py-8">
          <Breadcrumb items={[{ name: t(language, 'compareTitle'), path: '' }]} regionKey={regionKey} />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">
                {t(language, 'compareTitle')}
              </h1>
              <p className="text-text-secondary mt-2">{t(language, 'compareSubtitle')}</p>
            </div>
            {productIds.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="text-sm font-bold text-feedback-danger hover:underline self-start md:self-end"
              >
                {t(language, 'compareClearAll')}
              </button>
            )}
          </div>

          {loadState === 'partial' && unavailableIds.length > 0 && (
            <p role="status" className="mt-4 text-sm text-feedback-warning">
              {t(language, 'compareUnavailable', unavailableIds.length)}
            </p>
          )}
        </div>
      </div>

      <div className="container-fluid">
        {loadState === 'loading' ? (
          <div className="flex flex-col items-center gap-3 py-20" role="status" aria-live="polite">
            <div className="w-10 h-10 border-4 border-ember border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="text-sm text-text-secondary">{t(language, 'compareLoading')}</span>
          </div>
        ) : isEmpty ? (
          <div className="bg-surface border border-border rounded-2xl p-16 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-surface-sunken rounded-full flex items-center justify-center mx-auto mb-6 text-text-tertiary">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">{t(language, 'compareEmptyTitle')}</h2>
            <p className="text-text-secondary mb-8">
              {t(language, 'compareEmptyBody', MAX_COMPARE)}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-ember text-white font-bold hover:bg-ember-deep transition-colors shadow-md"
            >
              {t(language, 'compareStartShopping')}
            </Link>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <caption className="sr-only">{t(language, 'compareTableCaption', products.length)}</caption>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="p-6 bg-surface-raised border-b border-r border-border w-48 sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)] text-text-tertiary font-bold text-xs uppercase tracking-widest align-bottom"
                  >
                    {t(language, 'compareColumnLabel')}
                  </th>
                  {products.map(product => (
                    <th
                      key={product.id}
                      scope="col"
                      className="p-6 border-b border-r border-border min-w-[280px] w-[280px] bg-surface relative align-top"
                    >
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-surface-raised text-text-tertiary hover:text-feedback-danger hover:bg-surface-sunken transition-colors"
                        aria-label={t(language, 'compareTrayRemove')}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      <Link href={`/products/${product.slug || product.id}`} className="group block text-center">
                        <div className="relative aspect-square w-32 mx-auto mb-4 bg-surface-sunken rounded-xl overflow-hidden">
                          {(product.images?.[0] || product.thumbnail) ? (
                            <Image
                              src={storefrontImage(product.images?.[0] || product.thumbnail!) || ''}
                              alt={product.name}
                              fill
                              sizes="128px"
                              className="object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                              {product.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="block font-extrabold text-base text-text-primary group-hover:text-ember transition-colors leading-snug line-clamp-2 min-h-[44px]">
                          {product.name}
                        </span>
                      </Link>
                    </th>
                  ))}
                  {Array.from({ length: emptyColumns }).map((_, index) => (
                    <th
                      key={`empty-head-${index}`}
                      className="p-6 border-b border-r border-dashed border-border min-w-[280px] w-[280px] bg-surface-sunken/30 text-center align-middle font-semibold text-sm text-text-tertiary"
                    >
                      {t(language, 'compareAddItem')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label={t(language, 'compareRowPrice')}
                  products={products}
                  filler={emptyColumns}
                  render={product => (
                    <div className="font-black text-2xl text-action-primary">
                      <PriceDisplay
                        amountMinorUnits={product.regionPrices?.[0]?.priceMinorUnits ?? product.basePriceMinorUnits ?? 0}
                        currencyCode={product.regionPrices?.[0]?.currencyCode || product.currencyCode || 'USD'}
                      />
                    </div>
                  )}
                />
                <CompareRow
                  label={t(language, 'compareRowRating')}
                  products={products}
                  filler={emptyColumns}
                  render={product => (
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex items-center text-amber-500"
                        aria-label={
                          product.rating
                            ? t(language, 'productRatingLabel', product.rating)
                            : t(language, 'compareNotRated')
                        }
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        <span className="font-bold text-charcoal ml-1.5">
                          {product.rating && product.rating > 0 ? product.rating : t(language, 'compareNotRated')}
                        </span>
                      </div>
                      {product.reviewCount != null && product.reviewCount > 0 && (
                        <span className="text-xs text-text-tertiary">
                          {t(language, 'productReviewsLabel', product.reviewCount)}
                        </span>
                      )}
                    </div>
                  )}
                />
                <CompareRow
                  label={t(language, 'compareRowBrand')}
                  products={products}
                  filler={emptyColumns}
                  render={product => (
                    <span className="text-text-primary font-bold">
                      {product.brand?.name || t(language, 'compareUnknown')}
                    </span>
                  )}
                />
                <CompareRow
                  label={t(language, 'compareRowAvailability')}
                  products={products}
                  filler={emptyColumns}
                  render={product => (
                    <span
                      className={
                        product.inStock === false
                          ? 'font-bold text-feedback-danger'
                          : 'font-bold text-feedback-success'
                      }
                    >
                      {product.inStock === false ? t(language, 'productOutOfStock') : t(language, 'compareInStock')}
                    </span>
                  )}
                />
                <tr>
                  <th
                    scope="row"
                    className="p-6 bg-surface-raised border-r border-border font-semibold text-text-secondary sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)] text-left"
                  >
                    {t(language, 'compareColumnLabel')}
                  </th>
                  {products.map(product => (
                    <td key={`action-${product.id}`} className="p-6 border-r border-border bg-surface text-center">
                      <Link
                        href={`/products/${product.slug || product.id}`}
                        className="inline-flex items-center justify-center w-full h-12 rounded-full bg-charcoal text-white font-extrabold hover:bg-ember transition-colors shadow-md"
                      >
                        {t(language, 'compareViewDetails')}
                      </Link>
                    </td>
                  ))}
                  {Array.from({ length: emptyColumns }).map((_, index) => (
                    <td
                      key={`empty-action-${index}`}
                      className="p-6 border-r border-dashed border-border bg-surface-sunken/30"
                    />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  products,
  filler,
  render,
}: {
  label: string;
  products: CompareProduct[];
  filler: number;
  render: (product: CompareProduct) => React.ReactNode;
}) {
  return (
    <tr>
      <th
        scope="row"
        className="p-6 bg-surface-raised border-b border-r border-border font-semibold text-text-secondary sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)] text-left"
      >
        {label}
      </th>
      {products.map(product => (
        <td key={`${label}-${product.id}`} className="p-6 border-b border-r border-border bg-surface text-center">
          {render(product)}
        </td>
      ))}
      {Array.from({ length: filler }).map((_, index) => (
        <td
          key={`empty-${label}-${index}`}
          className="p-6 border-b border-r border-dashed border-border bg-surface-sunken/30"
        />
      ))}
    </tr>
  );
}
