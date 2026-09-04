'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ProductCardData } from '../ProductCard';
import { PriceDisplay } from '../PriceDisplay';

interface ProductCardInfoProps {
  product: ProductCardData;
  href: string;
  locale: string;
}

export function ProductCardInfo({ product, href, locale }: ProductCardInfoProps) {
  const savingMinorUnits = product.listPrice && product.listPrice > product.price ? product.listPrice - product.price : 0;
  const discountPct = savingMinorUnits > 0 && product.listPrice ? Math.round((savingMinorUnits / product.listPrice) * 100) : 0;

  return (
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

      <div className="flex items-end justify-between gap-2 mt-auto">
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
        {savingMinorUnits > 0 && (
          <span className="inline-flex items-center rounded-full bg-deal text-white text-[11px] font-extrabold px-2.5 py-1 shrink-0">
            -{discountPct}%
          </span>
        )}
      </div>
    </div>
  );
}
