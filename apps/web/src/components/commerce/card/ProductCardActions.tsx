'use client';

import type { ProductCardData } from '../ProductCard';
import { CompareButton } from '../CompareButton';
import { AddToCartInline } from './AddToCartInline';
import { WishlistButton } from './WishlistButton';

interface ProductCardActionsProps {
  product: ProductCardData;
}

export function ProductCardActions({ product }: ProductCardActionsProps) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <AddToCartInline product={product} />
      <CompareButton productId={product.id} />
      <WishlistButton product={product} className="ml-auto" />
    </div>
  );
}
