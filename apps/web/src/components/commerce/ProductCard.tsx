'use client';

import Link from 'next/link';
import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useCart } from '../providers/CartContext';
import { useWishlist } from '../providers/WishlistContext';
import { useToast } from '../feedback/Toast';
import { PriceDisplay } from './PriceDisplay';
import { storefrontImage } from '@/lib/images';

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
  badge?: 'sale' | 'new' | 'deal' | 'sponsored' | 'bestseller';
}

export interface ProductCardProps {
  product: ProductCardData;
  variant?: ProductCardVariant;
  locale?: string;
}

export function ProductCard({ product, variant = 'grid', locale = 'en-US' }: ProductCardProps) {
  const images = (product.images && product.images.length > 0 ? product.images : product.thumbnail ? [product.thumbnail] : [])
    .map(storefrontImage)
    .filter((image): image is string => Boolean(image));
  const href = `/products/${product.slug || product.id}`;
  const isList = variant === 'list';
  const hasDeal = product.dealLabel !== undefined;
  const isSponsored = product.sponsored;
  const badge = product.badge;

  if (variant === 'compact') {
    return (
      <Link href={href} className="flex gap-4 p-3 hover:bg-surface-sunken transition-colors rounded-lg border border-border">
        <div className="relative w-14 h-14 shrink-0 bg-surface rounded-md overflow-hidden">
          {images[0] && <Image src={images[0]} alt="" fill sizes="56px" className="object-contain p-0.5" />}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <p className="text-sm font-bold line-clamp-2 leading-tight text-text-primary group-hover:text-action-primary transition-colors">{product.name}</p>
          <div className="mt-1">
            <PriceDisplay amountMinorUnits={product.price} currencyCode={product.currencyCode} size="sm" />
          </div>
        </div>
      </Link>
    );
  }

  const savingMinorUnits = product.listPrice && product.listPrice > product.price ? product.listPrice - product.price : 0;

  // Badge HTML
  const badgeMap: Record<string, string> = {
    sale: '<span className="inline-flex items-center gap-0.5 rounded-xs bg-action-primary/10 text-action-primary text-[10px] px-1.5 py-0.5 uppercase tracking-wider">SALE</span>',
    new: '<span className="inline-flex items-center gap-0.5 rounded-xs bg-surface-overlay text-text-tertiary text-[10px] px-1.5 py-0.5 uppercase tracking-wider">NEW</span>',
    deal: '<span className="inline-flex items-center gap-0.5 rounded-xs bg-action-primary/10 text-action-primary text-[10px] px-1.5 py-0.5 uppercase tracking-wider">DEAL</span>',
    sponsored: '<span className="inline-flex items-center gap-0.5 rounded-xs bg-surface/90 backdrop-blur-sm px-2 py-1 text-[10px] font-bold bg-action-primary/20">Sponsored</span>',
    bestseller: '<span className="inline-flex items-center gap-0.5 rounded-xs bg-action-primary/10 text-action-primary text-[10px] px-1.5 py-0.5 uppercase tracking-wider">BEST SELLER</span>',
  };

  return (
    <article className={cn(
      'group relative bg-surface border border-border rounded-lg transition-all duration-normal',
      'hover:border-border-strong hover:shadow-card-inner',
      'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
    )}>
      {product.dealLabel && (
        <span className="absolute top-3 left-3 z-10 px-2 py-1 text-[2px] font-bold uppercase tracking-wider rounded-xs bg-action-primary text-white">
          {product.dealLabel}
        </span>
      )}

      <WishlistButton product={product} className="absolute top-3 right-3 z-10" />

      {isSponsored && (
        <span className="absolute top-3 right-3 z-10 text-[2px] font-bold uppercase bg-surface/80 backdrop-blur-sm px-2 py-1 rounded text-action-primary">
          Sponsored
        </span>
      )}

      {badge && (
        <span className="absolute top-3 left-3 z-10">
          {badgeMap[badge as keyof typeof badgeMap]}
        </span>
      )}

      <Link
        href={href}
        className={cn(
          'relative block aspect-[4/3] rounded-lg overflow-hidden',
          isList ? 'aspect-auto' : ''
        )}
        aria-label={product.name}
        tabIndex={-1}
      >
        {images[0] ? (
          <Image
            src={images[0]}
            alt=""
            fill
            sizes={isList ? '192px' : '((max-width:1024px) calc(100% - 1rem), 280px)'}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-border-strong text-lg font-bold bg-surface-sunken">
            {product.name.slice(0, 1)}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-sm font-bold line-clamp-2 leading-snug text-text-primary">
            {product.name}
          </h3>
        </div>

        <div className="pt-3">
          <PriceDisplay amountMinorUnits={product.price} currencyCode={product.currencyCode} size="md" locale={locale} />

          {savingMinorUnits > 0 && product.listPrice && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-text-tertiary line-through">
                Was <PriceDisplay amountMinorUnits={product.listPrice} currencyCode={product.currencyCode} size="sm" />
              </span>
              <span className="text-xs text-action-primary font-bold">
                Save <PriceDisplay amountMinorUnits={savingMinorUnits} currencyCode={product.currencyCode} size="sm" />
              </span>
            </div>
          )}

          {product.inventoryCount !== undefined && product.inventoryCount <= 0 && (
            <p className="text-[2px] text-feedback-danger font-bold mt-1">Out of stock</p>
          )}
          {product.inventoryCount !== undefined && product.inventoryCount > 0 && product.inventoryCount <= 3 && (
            <p className="text-[2px] text-charcoal font-bold mt-1">Only {product.inventoryCount} left</p>
          )}

          {(product.inventoryCount === undefined || product.inventoryCount > 0) && (
            <p className="text-[2px] text-feedback-success font-semibold mt-1">
              <svg className="w-3 h-3 shrink-0 me-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Available for delivery
            </p>
          )}
        </div>

        <div className="mt-auto pt-3">
          <AddToCartInline product={product} />
        </div>
      </Link>
    </article>
  );
}

function StarLine({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-block w-16 h-3.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        <span className="absolute inset-0 flex text-border-strong tracking-tighter">{"★★★★★"}</span>
        <span className="absolute inset-0 overflow-hidden text-action-primary tracking-tighter whitespace-nowrap" style={{ width: `${(rating / 5) * 100}%` }}>{"★★★★★"}</span>
      </span>
      <span className="text-xs text-text-secondary font-medium">({count.toLocaleString()})</span>
    </span>
  );
}

function WishlistButton({ product, className }: { product: ProductCardData; className?: string }) {
  const wishlist = useWishlist();
  const { toast } = useToast();
  const saved = wishlist.has(product.id);
  return (
    <button
      type="button"
      onClick={e => {
        e.preventDefault();
        wishlist.toggle({
          productId: product.id, name: product.name, slug: product.slug,
          image: product.thumbnail || product.images?.[0],
          unitPriceMinorUnits: product.price, currencyCode: product.currencyCode,
        });
        toast({ variant: saved ? 'info' : 'success', title: saved ? 'Removed from wishlist' : 'Saved to wishlist', description: product.name });
      }}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      aria-pressed={saved}
      className={cn(
        'w-8 h-8 rounded-full bg-white border border-border shadow-sm hover:border-action-primary transition-colors',
        saved ? 'text-action-primary border-action-primary bg-action-primary/5' : 'text-text-tertiary hover:text-action-primary',
        className
      )}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>
  );
}

function AddToCartInline({ product }: { product: ProductCardData }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const outOfStock = product.inventoryCount !== undefined && product.inventoryCount <= 0;

  if (outOfStock) {
    return (
      <button
        type="button"
        onClick={() => toast({ variant: 'success', title: 'We will notify you when back in stock', description: product.name })}
        className="w-full h-10 font-bold text-sm border border-border-strong text-text-primary bg-surface hover:bg-surface-sunken transition-colors rounded-xs"
      >
        Notify Me
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={e => {
        e.preventDefault();
        addItem({
          productId: product.id, name: product.name, slug: product.slug,
          image: product.thumbnail, unitPriceMinorUnits: product.price,
          currencyCode: product.currencyCode, quantity: 1,
          stock: product.inventoryCount, vendorName: product.vendor?.storeName,
        });
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1400);
      }}
      aria-live="polite"
      className={cn(
        'w-full h-10 font-bold text-sm transition-colors duration-fast rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        justAdded
          ? 'bg-feedback-success text-white focus-visible:ring-feedback-success'
          : 'bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:ring-action-primary'
      )}
    >
      {justAdded ? '✓ Added to basket' : 'Add to basket'}
    </button>
  );
}