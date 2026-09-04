'use client';

import { useState } from 'react';
import { PdpProduct, PdpVariant } from '../ProductDetailClient';
import { AddToCartButton } from '../AddToCartButton';
import { WishlistShare } from '../WishlistShare';
import { useToast } from '../../feedback/Toast';

interface PdpBuyBoxProps {
  product: PdpProduct;
  variant?: PdpVariant;
  variantId?: string;
  images: string[];
  activeUnitPrice: number;
  currency: string;
  stock?: number;
}

export function PdpBuyBox({ product, variant, variantId, images, activeUnitPrice, currency, stock }: PdpBuyBoxProps) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="bg-surface-sunken p-5 rounded-xs border border-border">
      <div className="flex items-center justify-between gap-3 mb-4">
        <label htmlFor="qty" className="text-sm font-bold text-text-primary">Quantity</label>
        <div className="inline-flex items-center rounded-xs border border-border bg-surface overflow-hidden" role="group" aria-label="Quantity">
          <button
            type="button"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="w-11 h-11 font-bold text-lg hover:bg-surface-raised hover:text-action-primary transition-colors"
          >
            −
          </button>
          <input
            id="qty"
            readOnly
            value={quantity}
            aria-live="polite"
            className="w-12 text-center text-sm font-extrabold outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => setQuantity(q => Math.min(stock ?? 99, q + 1))}
            aria-label="Increase quantity"
            className="w-11 h-11 font-bold text-lg hover:bg-surface-raised hover:text-action-primary transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {stock && stock > 0 ? (
        <div className="space-y-3">
          <AddToCartButton
            productId={product.id}
            variantId={variantId}
            name={product.name}
            slug={product.slug}
            image={images[0]}
            unitPriceMinorUnits={activeUnitPrice}
            listPriceMinorUnits={product.listPriceMinorUnits}
            currencyCode={currency}
            quantity={quantity}
            stock={stock}
            vendorName={product.vendor?.storeName}
            label="Add to basket"
            size="lg"
            fullWidth
            className="rounded-full font-bold text-base"
          />
          <AddToCartButton
            mode="buynow"
            productId={product.id}
            variantId={variantId}
            name={product.name}
            slug={product.slug}
            image={images[0]}
            unitPriceMinorUnits={activeUnitPrice}
            listPriceMinorUnits={product.listPriceMinorUnits}
            currencyCode={currency}
            quantity={quantity}
            stock={stock}
            vendorName={product.vendor?.storeName}
            size="lg"
            fullWidth
          />
        </div>
      ) : (
        <NotifyMe productId={product.id} />
      )}

      <div className="pt-2">
        <WishlistShare product={product} />
      </div>
    </div>
  );
}

function NotifyMe({ productId }: { productId: string }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        toast({ variant: 'success', title: 'We will notify you', description: email });
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="h-12 w-full rounded-full px-5 text-sm border-border focus:border-action-primary"
      />
      <button type="submit" className="h-12 w-full rounded-full text-sm font-bold bg-action-primary text-white hover:bg-action-primary-hover transition-colors">
        Notify me when available
      </button>
    </form>
  );
}
