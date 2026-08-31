'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCompareStore } from '@/store/useCompareStore';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import { storefrontImage } from '@/lib/images';

export function CompareClient({ regionKey }: { regionKey: string }) {
  const { productIds, removeProduct, clearCompare } = useCompareStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      if (productIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const fetched = await Promise.all(
          productIds.map(async (id) => {
            const res = await fetch(`/api/v1/products/${id}?regionKey=${regionKey}`);
            if (!res.ok) return null;
            return await res.json();
          })
        );
        setProducts(fetched.filter(Boolean));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [productIds, regionKey]);

  return (
    <div className="bg-surface-sunken min-h-screen pb-24">
      <div className="bg-surface border-b border-border mb-8 shadow-sm">
        <div className="container-fluid py-8">
          <Breadcrumb items={[{ name: 'Compare Products', path: '' }]} regionKey={regionKey} />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">Compare Products</h1>
              <p className="text-text-secondary mt-2">Side-by-side spec comparison to help you choose.</p>
            </div>
            {productIds.length > 0 && (
              <button 
                onClick={clearCompare}
                className="text-sm font-bold text-feedback-danger hover:underline self-start md:self-end"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container-fluid">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-ember border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-16 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-20 h-20 bg-surface-sunken rounded-full flex items-center justify-center mx-auto mb-6 text-text-tertiary">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-3">Nothing to compare yet</h2>
            <p className="text-text-secondary mb-8">Add up to 4 items to see a detailed side-by-side breakdown of features and pricing.</p>
            <Link href="/" className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-ember text-white font-bold hover:bg-ember-deep transition-colors shadow-md">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="p-6 bg-surface-raised border-b border-r border-border w-48 sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)] text-text-tertiary font-bold text-xs uppercase tracking-widest align-bottom">
                    Product
                  </th>
                  {products.map((p) => {
                    const img = p.images?.[0] || p.thumbnail;
                    return (
                      <th key={p.id} className="p-6 border-b border-r border-border min-w-[280px] w-[280px] bg-surface relative align-top">
                        <button 
                          onClick={() => removeProduct(p.id)}
                          className="absolute top-4 right-4 p-1.5 rounded-full bg-surface-raised text-text-tertiary hover:text-feedback-danger hover:bg-red-50 transition-colors"
                          title="Remove from comparison"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <Link href={`/products/${p.slug || p.id}`} className="group block text-center">
                          <div className="relative aspect-square w-32 mx-auto mb-4 bg-surface-sunken rounded-xl overflow-hidden">
                            {img ? (
                               <Image src={storefrontImage(img) || ''} alt={p.name} fill className="object-contain p-2 mix-blend-multiply group-hover:scale-105 transition-transform" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center text-text-tertiary">{p.name.charAt(0)}</div>
                            )}
                          </div>
                          <h3 className="font-extrabold text-base text-text-primary group-hover:text-ember transition-colors leading-snug line-clamp-2 min-h-[44px]">
                            {p.name}
                          </h3>
                        </Link>
                      </th>
                    );
                  })}
                  {/* Empty filler columns if less than 4 */}
                  {Array.from({ length: 4 - products.length }).map((_, i) => (
                    <th key={`empty-head-${i}`} className="p-6 border-b border-r border-border min-w-[280px] w-[280px] bg-surface-sunken/30 text-center align-middle border-dashed">
                      <div className="text-text-tertiary text-sm font-semibold">Add Item</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Price Row */}
                <tr>
                  <td className="p-6 bg-surface-raised border-b border-r border-border font-semibold text-text-secondary sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)]">
                    Price
                  </td>
                  {products.map((p) => (
                    <td key={`price-${p.id}`} className="p-6 border-b border-r border-border bg-surface text-center">
                      <div className="font-black text-2xl text-action-primary">
                        <PriceDisplay amountMinorUnits={p.regionPrices?.[0]?.priceMinorUnits || p.basePriceMinorUnits} currencyCode={p.regionPrices?.[0]?.currencyCode || 'USD'} />
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: 4 - products.length }).map((_, i) => (
                    <td key={`empty-price-${i}`} className="p-6 border-b border-r border-border bg-surface-sunken/30 border-dashed" />
                  ))}
                </tr>
                {/* Rating Row */}
                <tr>
                  <td className="p-6 bg-surface-raised border-b border-r border-border font-semibold text-text-secondary sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)]">
                    Rating
                  </td>
                  {products.map((p) => (
                    <td key={`rating-${p.id}`} className="p-6 border-b border-r border-border bg-surface text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center text-amber-500">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          <span className="font-bold text-charcoal ml-1.5">{p.rating > 0 ? p.rating : 'N/A'}</span>
                        </div>
                        {p.reviewCount > 0 && <span className="text-xs text-text-tertiary">({p.reviewCount} reviews)</span>}
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: 4 - products.length }).map((_, i) => (
                    <td key={`empty-rating-${i}`} className="p-6 border-b border-r border-border bg-surface-sunken/30 border-dashed" />
                  ))}
                </tr>
                {/* Brand Row */}
                <tr>
                  <td className="p-6 bg-surface-raised border-b border-r border-border font-semibold text-text-secondary sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)]">
                    Brand
                  </td>
                  {products.map((p) => (
                    <td key={`brand-${p.id}`} className="p-6 border-b border-r border-border bg-surface text-center text-text-primary font-bold">
                      {p.brand?.name || '-'}
                    </td>
                  ))}
                  {Array.from({ length: 4 - products.length }).map((_, i) => (
                    <td key={`empty-brand-${i}`} className="p-6 border-b border-r border-border bg-surface-sunken/30 border-dashed" />
                  ))}
                </tr>
                {/* Action Row */}
                <tr>
                  <td className="p-6 bg-surface-raised border-r border-border font-semibold text-text-secondary sticky left-0 z-10 shadow-[1px_0_0_var(--color-border)]">
                    Action
                  </td>
                  {products.map((p) => (
                    <td key={`action-${p.id}`} className="p-6 border-r border-border bg-surface text-center">
                       <Link 
                          href={`/products/${p.slug || p.id}`}
                          className="inline-flex items-center justify-center w-full h-12 rounded-full bg-charcoal text-white font-extrabold hover:bg-ember transition-colors shadow-md"
                        >
                         View Details
                       </Link>
                    </td>
                  ))}
                  {Array.from({ length: 4 - products.length }).map((_, i) => (
                    <td key={`empty-action-${i}`} className="p-6 border-r border-border bg-surface-sunken/30 border-dashed" />
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
