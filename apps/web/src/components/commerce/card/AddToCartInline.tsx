'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useCart } from '../../providers/CartContext';
import { useToast } from '../../feedback/Toast';
import type { ProductCardData } from '../ProductCard';

export function AddToCartInline({ product }: { product: ProductCardData }) {
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