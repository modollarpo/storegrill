'use client';

import { useWishlist } from '../providers/WishlistContext';
import { useToast } from '../feedback/Toast';
import { ProductShare } from './ProductShare';
import { cn } from '@/lib/utils';

interface WishlistShareProps {
  product: {
    id: string;
    name: string;
    slug?: string;
    price: number;
    currencyCode: string;
    image?: string;
  };
  className?: string;
}

export function WishlistShare({ product, className }: WishlistShareProps) {
  const wishlist = useWishlist();
  const { toast } = useToast();
  const saved = wishlist.has(product.id);

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <button
        type="button"
        onClick={() => {
          wishlist.toggle({
            productId: product.id,
            name: product.name,
            slug: product.slug,
            image: product.image,
            unitPriceMinorUnits: product.price,
            currencyCode: product.currencyCode,
          });
          toast({ variant: saved ? 'info' : 'success', title: saved ? 'Removed from wishlist' : 'Saved to wishlist', description: product.name });
        }}
        aria-pressed={saved}
        className={cn(
          'inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-bold border border-border bg-surface transition-colors',
          saved ? 'text-ember border-ember/40' : 'text-text-primary hover:border-ember hover:text-ember'
        )}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        {saved ? 'In wishlist' : 'Add to wishlist'}
      </button>

      <ProductShare name={product.name} slug={product.slug} className="flex-row items-center !gap-1" />
    </div>
  );
}