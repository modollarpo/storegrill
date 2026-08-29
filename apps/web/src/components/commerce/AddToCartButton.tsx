'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, CartItemLine } from '../providers/CartContext';
import { useToast } from '../feedback/Toast';
import { cn } from '@/lib/utils';

export interface AddToCartButtonProps {
  productId: string;
  variantId?: string;
  name: string;
  slug?: string;
  image?: string;
  unitPriceMinorUnits: number;
  currencyCode: string;
  quantity?: number;
  stock?: number;
  vendorName?: string;
  label?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  mode?: 'add' | 'buynow';
}

const SIZE_CLASS = {
  sm: 'h-9 text-xs px-4 rounded-xs',
  md: 'h-11 text-[13px] px-6 rounded-xs font-bold',
  lg: 'h-14 text-base px-8 rounded-xs font-bold',
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const cart = useCart();
  const router = useRouter();
  const { toast } = useToast();
  const [justAdded, setJustAdded] = useState(false);
  
  const outOfStock = props.stock !== undefined && props.stock <= 0;
  const isBuyNow = props.mode === 'buynow';

  function handleAdd() {
    if (outOfStock) return;
    const line: CartItemLine = {
      productId: props.productId,
      variantId: props.variantId,
      name: props.name,
      slug: props.slug,
      image: props.image,
      unitPriceMinorUnits: props.unitPriceMinorUnits,
      currencyCode: props.currencyCode,
      quantity: props.quantity || 1,
      stock: props.stock,
      vendorName: props.vendorName,
    };
    cart.addItem(line);
    
    if (isBuyNow) {
      router.push('/checkout');
      return;
    }
    
    // Micro-interaction: Success flash
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
    
    toast({
      variant: 'success',
      title: 'Added to basket',
      description: props.name,
    });
  }

  if (outOfStock) {
    return (
      <button
        type="button"
        onClick={() => toast({ variant: 'success', title: 'We will notify you', description: `${props.name} is back in stock` })}
        className={cn('inline-flex items-center justify-center font-bold border-2 border-gray-200 text-gray-900 bg-surface hover:bg-gray-100 transition-colors', props.fullWidth && 'w-full', SIZE_CLASS[props.size ?? 'md'])}
      >
        Notify Me
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
        className={cn(
          'relative overflow-hidden inline-flex items-center justify-center font-bold transition-colors duration-fast',
          props.fullWidth && 'w-full',
          SIZE_CLASS[props.size ?? 'md'],
          isBuyNow
            ? 'border border-action-primary text-action-primary bg-surface hover:bg-action-primary/5'
            : 'bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-active',
          justAdded && !isBuyNow && 'bg-feedback-success hover:bg-feedback-success text-white'
        )}
    >
      <span className={cn('flex items-center justify-center gap-2 transition-transform duration-300', justAdded && !isBuyNow ? '-translate-y-12' : 'translate-y-0')}>
        {isBuyNow && (
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
        )}
        {props.label ?? (isBuyNow ? 'Buy Now' : 'Add to basket')}
      </span>
      
      {/* Success overlay text */}
      {!isBuyNow && (
        <span className={cn('absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300', justAdded ? 'translate-y-0' : 'translate-y-12')}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          Added
        </span>
      )}
    </button>
  );
}
