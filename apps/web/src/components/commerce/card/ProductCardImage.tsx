'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ProductCardData } from '../ProductCard';
import { badgeLabel, badgeStyle } from './badge';

interface ProductCardImageProps {
  product: ProductCardData;
  images: string[];
  href: string;
  language: string;
}

export function ProductCardImage({ product, images, href, language }: ProductCardImageProps) {
  const label = product.dealLabel || (product.badge ? badgeLabel(language, product.badge) : undefined);

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

      {label && (
        <span className="absolute top-2 left-2 z-10">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              product.dealLabel ? 'bg-deal text-white' : product.badge ? badgeStyle(product.badge) : 'bg-ember text-white'
            )}
          >
            {label}
          </span>
        </span>
      )}
    </Link>
  );
}
