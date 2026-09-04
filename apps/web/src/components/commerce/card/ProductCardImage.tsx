'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ProductCardData } from '../ProductCard';

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

interface ProductCardImageProps {
  product: ProductCardData;
  images: string[];
  href: string;
}

export function ProductCardImage({ product, images, href }: ProductCardImageProps) {
  return (
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
  );
}
