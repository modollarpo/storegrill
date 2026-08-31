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
import { QuickViewModal } from './QuickViewModal';
import { CompareButton } from './CompareButton';

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
  categoryId?: string;
}

export interface ProductCardProps {
  product: ProductCardData;
  variant?: ProductCardVariant;
  locale?: string;
}

const BADGE_STYLES: Record<string, string> = {
  sale: 'bg-feedback-danger text-white',
  new: 'bg-black text-white',
  deal: 'bg-ember text-white',
  sponsored: 'bg-surface text-text-secondary border border-border',
  bestseller: 'bg-ember text-white',
};

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
            <PriceDisplay amountMinorUnits={product.price} currencyCode={product.currencyCode} size="sm" />
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
  const savingMinorUnits = product.listPrice && product.listPrice > product.price ? product.listPrice - product.price : 0;
  const [showQuickView, setShowQuickView] = useState(false);

  return (
    <article aria-label={product.name} className="group h-full flex flex-col">
      <Link href={href} className="relative block overflow-hidden bg-white aspect-square mb-3">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 250px"
            loading="lazy"
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-text-tertiary font-bold text-3xl">
            {product.name.slice(0, 1)}
          </div>
        )}

        {(product.badge || product.dealLabel) && (
          <span className="absolute top-2 left-2 z-10">
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              product.dealLabel ? 'bg-deal text-white' : BADGE_STYLES[product.badge || ''],
            )}>
              {product.dealLabel || BADGE_LABELS[product.badge || '']}
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-col flex-grow">
        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1">
            <div className="flex items-center" aria-label={`${product.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map(star => (
                <svg
                  key={star}
                  aria-hidden="true"
                  className={cn('w-3 h-3', star <= product.rating ? 'text-amber-500' : 'text-smoke-200')}
                  viewBox="0 0 24 24"
                  fill={star <= product.rating ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ))}
            </div>
            <span className="text-[11px] text-text-tertiary">({product.reviewCount})</span>
          </div>
        )}

        <h3 className="text-sm text-text-primary leading-snug line-clamp-2 mb-1.5">
          <Link href={href} className="hover:text-ember transition-colors">{product.name}</Link>
        </h3>

        <div className="mb-2">
           <CompareButton productId={product.id} />
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-base text-text-primary">
              <PriceDisplay amountMinorUnits={product.price} currencyCode={product.currencyCode} size="md" locale={locale} />
            </span>
            {savingMinorUnits > 0 && product.listPrice && (
              <span className="text-xs text-text-tertiary line-through">
                <PriceDisplay amountMinorUnits={product.listPrice} currencyCode={product.currencyCode} size="sm" />
              </span>
            )}
          </div>

          <AddToCartInline product={product} />
        </div>
      </div>

      {showQuickView && <QuickViewModal product={product} onClose={() => setShowQuickView(false)} />}
    </article>
  );
}

function ListCard({ product, images, href, locale }: { product: ProductCardData; images: string[]; href: string; locale: string }) {
  const savingMinorUnits = product.listPrice && product.listPrice > product.price ? product.listPrice - product.price : 0;

  return (
    <article aria-label={product.name} className="group flex gap-5 p-4 rounded-lg bg-surface shadow-card hover:shadow-md transition-shadow">
      <Link href={href} tabIndex={-1} aria-label={product.name} className="shrink-0">
        <div className="relative w-[180px] h-[180px] overflow-hidden rounded-lg bg-surface-sunken">
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
        </div>

        {product.inventoryCount !== undefined && product.inventoryCount <= 0 && (
          <p className="text-xs text-feedback-danger font-medium mt-1">Out of stock</p>
        )}

        <div className="mt-auto pt-3">
          <AddToCartInline product={product} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <WishlistButton product={product} className="w-9 h-9 shrink-0" />
        <CompareButton productId={product.id} className="mt-2" />
      </div>
    </article>
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
        'flex items-center justify-center w-9 h-9 rounded-xs shadow-card ease-out duration-200 bg-surface text-text-primary hover:text-ember transition-colors',
        saved && 'text-ember',
        className
      )}
    >
      <svg className="fill-current" width="16" height="16" viewBox="0 0 16 16" fill={saved ? 'currentColor' : 'none'} aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M3.74949 2.94946C2.6435 3.45502 1.83325 4.65749 1.83325 6.0914C1.83325 7.55633 2.43273 8.68549 3.29211 9.65318C4.0004 10.4507 4.85781 11.1118 5.694 11.7564C5.89261 11.9095 6.09002 12.0617 6.28395 12.2146C6.63464 12.491 6.94747 12.7337 7.24899 12.9099C7.55068 13.0862 7.79352 13.1667 7.99992 13.1667C8.20632 13.1667 8.44916 13.0862 8.75085 12.9099C9.05237 12.7337 9.3652 12.491 9.71589 12.2146C9.90982 12.0617 10.1072 11.9095 10.3058 11.7564C11.142 11.1118 11.9994 10.4507 12.7077 9.65318C13.5671 8.68549 14.1666 7.55633 14.1666 6.0914C14.1666 4.65749 13.3563 3.45502 12.2503 2.94946C11.1759 2.45832 9.73214 2.58839 8.36016 4.01382C8.2659 4.11175 8.13584 4.16709 7.99992 4.16709C7.864 4.16709 7.73393 4.11175 7.63967 4.01382C6.26769 2.58839 4.82396 2.45832 3.74949 2.94946ZM7.99992 2.97255C6.45855 1.5935 4.73256 1.40058 3.33376 2.03998C1.85639 2.71528 0.833252 4.28336 0.833252 6.0914C0.833252 7.86842 1.57358 9.22404 2.5444 10.3172C3.32183 11.1926 4.2734 11.9253 5.1138 12.5724C5.30431 12.7191 5.48911 12.8614 5.66486 12.9999C6.00636 13.2691 6.37295 13.5562 6.74447 13.7733C7.11582 13.9903 7.53965 14.1667 7.99992 14.1667C8.46018 14.1667 8.88401 13.9903 9.25537 13.7733C9.62689 13.5562 9.99348 13.2691 10.335 12.9999C10.5107 12.8614 10.6955 12.7191 10.886 12.5724C11.7264 11.9253 12.678 11.1926 13.4554 10.3172C14.4263 9.22404 15.1666 7.86842 15.1666 6.0914C15.1666 4.28336 14.1434 2.71528 12.6661 2.03998C11.2673 1.40058 9.54129 1.5935 7.99992 2.97255Z" />
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
        aria-label={`Notify me when ${product.name} is back in stock`}
        className="inline-flex font-medium text-xs py-[7px] px-5 rounded-xs bg-surface text-text-primary shadow-card ease-out duration-200 hover:text-ember"
      >
        Notify Me
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={justAdded}
      onClick={e => {
        e.preventDefault();
        if (justAdded) return;
        addItem({
          productId: product.id, name: product.name, slug: product.slug,
          image: product.thumbnail, unitPriceMinorUnits: product.price,
          currencyCode: product.currencyCode, quantity: 1,
          stock: product.inventoryCount, vendorName: product.vendor?.storeName,
          categoryId: product.categoryId,
        });
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1400);
      }}
      aria-live="polite"
      aria-label={justAdded ? `${product.name} added to basket` : `Add ${product.name} to basket`}
      className={cn(
        'inline-flex font-medium text-xs py-[7px] px-5 rounded-xs ease-out duration-200 shadow-card disabled:cursor-not-allowed',
        justAdded
          ? 'bg-feedback-success text-white'
          : 'bg-ember text-white hover:bg-ember-dark'
      )}
    >
      {justAdded ? '✓ Added' : 'Add to cart'}
    </button>
  );
}
