'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PriceDisplay } from '@/components/commerce/PriceDisplay';
import { storefrontImage } from '@/lib/images';
import { VerifiedBadge } from '@/components/commerce/trust/VerifiedBadge';

interface BestsellerProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  listPrice?: number;
  currencyCode: string;
  thumbnail?: string;
  reviewCount: number;
  vendor?: { storeName: string; slug: string; verified?: boolean } | null;
}

interface BestsellersProps {
  regionKey?: string;
  categorySlug?: string;
  limit?: number;
  className?: string;
}

export function Bestsellers({ regionKey, categorySlug, limit = 12, className }: BestsellersProps) {
  const [products, setProducts] = useState<BestsellerProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const base = categorySlug
          ? `/api/v1/bestsellers/category/${categorySlug}`
          : '/api/v1/bestsellers';
        const params = new URLSearchParams();
        if (regionKey) params.set('regionKey', regionKey);
        params.set('limit', String(limit));

        const res = await fetch(`${base}?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setProducts([]);
      }
      setLoading(false);
    }
    load();
  }, [regionKey, categorySlug, limit]);

  if (loading || products.length === 0) return null;

  return (
    <section className={cn('py-8', className)} aria-labelledby="bestsellers-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="bestsellers-heading" className="text-xl font-extrabold text-text-primary">
          {categorySlug ? `Popular in ${categorySlug.replace(/-/g, ' ')}` : 'Bestsellers'}
        </h2>
        <Link href="/products?sort=bestselling" className="text-xs font-bold text-action-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {products.map(product => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group bg-surface-raised border border-border rounded-lg p-3 hover:shadow-md hover:border-action-primary transition-all"
          >
            <div className="relative w-full aspect-square rounded-md bg-surface-sunken overflow-hidden mb-2">
              {product.thumbnail ? (
                <Image
                  src={storefrontImage(product.thumbnail) || ''}
                  alt={product.name}
                  fill
                  sizes="200px"
                  className="object-contain p-1 mix-blend-multiply group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-text-tertiary font-bold text-2xl">
                  {product.name.charAt(0)}
                </div>
              )}
            </div>
            <h3 className="text-xs font-medium text-text-primary line-clamp-2 mb-1 group-hover:text-action-primary transition-colors">
              {product.name}
            </h3>
            <PriceDisplay
              amountMinorUnits={product.price}
              listMinorUnits={product.listPrice}
              currencyCode={product.currencyCode}
              size="sm"
            />
            {product.vendor?.verified && (
              <VerifiedBadge size="sm" className="mt-1" />
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
