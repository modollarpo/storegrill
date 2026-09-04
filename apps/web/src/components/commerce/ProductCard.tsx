'use client';

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PriceDisplay } from './PriceDisplay';
import { storefrontImage } from '@/lib/images';
import { QuickViewModal } from './QuickViewModal';
import { CompareButton } from './CompareButton';
import { ProductCardImage } from './card/ProductCardImage';
import { ProductCardInfo } from './card/ProductCardInfo';
import { ProductCardActions } from './card/ProductCardActions';
import { AddToCartInline } from './card/AddToCartInline';
import { WishlistButton } from './card/WishlistButton';

export type ProductCardVariant = 'grid' | 'list' | 'wide' | 'compact';

export interface ProductCardData {
  id: string;
  name: string;
  slug?: string;
  thumbnail?: string;
  images?: string[];
  price: number;
  listPrice?: number;
  currencyCode: string;
  rating: number;
  reviewCount: number;
  inventoryCount?: number;
  expressEligible?: boolean;
  dealLabel?: string;
  sponsored?: boolean;
  vendor?: { storeName: string; slug: string; verified?: boolean } | null;
  badge?: 'sale' | 'new' | 'deal' | 'sponsored' | 'bestseller' | 'trending';
  categoryId?: string;
}

export interface ProductCardProps {
  product: ProductCardData;
  variant?: ProductCardVariant;
  locale?: string;
}


const BADGE_LABELS: Record<string, string> = {
  sale: 'Sale',
  new: 'New',
  deal: 'Deal',
  sponsored: 'Sponsored',
  bestseller: 'Best Seller',
};

export function ProductCard({ product, variant = 'grid', locale = 'en-US' }: ProductCardProps) {
  const images = (product.images && product.images.length > 0 ? product.images : product.thumbnail ? [product.thumbnail] : [])
    .map(storefrontImage)
    .filter((image): image is string => Boolean(image));
  const href = `/products/${product.slug || product.id}`;

  if (variant === 'compact') {
    return (
      <Link href={href} className="group flex gap-4 p-3 hover:bg-surface-sunken transition-colors rounded-md border border-border">
        <div className="relative w-14 h-14 shrink-0 bg-surface rounded-md overflow-hidden">
          {images[0] && <Image src={images[0]} alt={product.name} fill sizes="56px" className="object-contain p-0.5" loading="lazy" />}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-sm font-normal leading-snug line-clamp-2 text-text-primary group-hover:text-ember transition-colors">{product.name}</p>
          <div className="mt-1">
            <PriceDisplay amountMinorUnits={product.price} listMinorUnits={product.listPrice} currencyCode={product.currencyCode} size="sm" />
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'list') {
    return (
      <ListCard product={product} images={images} href={href} locale={locale} />
    );
  }

  return (
    <GridCard product={product} images={images} href={href} locale={locale} />
  );
}

function GridCard({ product, images, href, locale }: { product: ProductCardData; images: string[]; href: string; locale: string }) {
  const [showQuickView, setShowQuickView] = useState(false);

  return (
    <article aria-label={product.name} className="group h-full flex flex-col">
      <ProductCardImage product={product} images={images} href={href} />
      
      <ProductCardInfo product={product} href={href} locale={locale} />

      <ProductCardActions product={product} />

      {showQuickView && <QuickViewModal product={product} onClose={() => setShowQuickView(false)} />}
    </article>
  );
}

function ListCard({ product, images, href, locale }: { product: ProductCardData; images: string[]; href: string; locale: string }) {
  const savingMinorUnits = product.listPrice && product.listPrice > product.price ? product.listPrice - product.price : 0;
  const discountPct = savingMinorUnits > 0 && product.listPrice ? Math.round((savingMinorUnits / product.listPrice) * 100) : 0;

  return (
    <article aria-label={product.name} className="group flex flex-col sm:flex-row gap-5 p-4 rounded-lg bg-surface shadow-card hover:shadow-md transition-shadow">
      <Link href={href} tabIndex={-1} aria-label={product.name} className="shrink-0">
        <div className="relative w-full h-[180px] sm:w-[180px] sm:h-[180px] overflow-hidden rounded-lg bg-surface-sunken">
          {images[0] ? (
            <Image
              src={images[0]}
              alt={product.name}
              fill
              sizes="180px"
              loading="lazy"
              className="object-contain p-2 mix-blend-multiply"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-text-tertiary font-bold text-2xl">
              {product.name.slice(0, 1)}
            </div>
          )}
          {product.badge && (
            <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center rounded-xs px-3 py-1 text-xs font-medium bg-ember text-white">
              {BADGE_LABELS[product.badge]}
            </span>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Star rating */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex items-center" aria-label={`${product.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map(star => (
                <svg
                  key={star}
                  aria-hidden="true"
                  className={cn('w-3.5 h-3.5', star <= product.rating ? 'text-ember' : 'text-text-disabled')}
                  viewBox="0 0 24 24"
                  fill={star <= product.rating ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-text-tertiary">({product.reviewCount})</span>
          </div>
        )}

        <Link href={href} className="block">
          <h3 className="font-medium text-sm text-text-primary line-clamp-2 group-hover:text-ember transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mt-2">
          <span className="font-medium text-lg text-text-primary">
            <PriceDisplay amountMinorUnits={product.price} currencyCode={product.currencyCode} size="md" locale={locale} />
          </span>
          {savingMinorUnits > 0 && product.listPrice && (
            <span className="text-sm text-text-tertiary line-through">
              <PriceDisplay amountMinorUnits={product.listPrice} currencyCode={product.currencyCode} size="sm" />
            </span>
          )}
          {savingMinorUnits > 0 && (
            <span className="inline-flex items-center rounded-full bg-deal text-white text-[11px] font-extrabold px-2.5 py-1">
              -{discountPct}%
            </span>
          )}
        </div>

        {product.inventoryCount !== undefined && product.inventoryCount <= 0 && (
          <p className="text-xs text-feedback-danger font-medium mt-1">Out of stock</p>
        )}

        <div className="mt-auto pt-3">
          <AddToCartInline product={product} />
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-center gap-2">
        <WishlistButton product={product} className="w-11 h-11 shrink-0" />
        <CompareButton productId={product.id} className="mt-2" />
      </div>
    </article>
  );
}
