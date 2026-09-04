'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCart } from '../providers/CartContext';
import { useWishlist } from '../providers/WishlistContext';
import { PriceDisplay } from './PriceDisplay';
import { storefrontImage } from '@/lib/images';
import { Button } from '../ui/Button';
import { ProductCardData } from './ProductCard';

export function QuickViewModal({ product, onClose }: { product: ProductCardData; onClose: () => void }) {
  const [quantity, setQuantity] = useState(1);
  const cart = useCart();
  const wishlist = useWishlist();

  const images = (product.images && product.images.length > 0 ? product.images : product.thumbnail ? [product.thumbnail] : [])
    .map(storefrontImage)
    .filter((image): image is string => Boolean(image));

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 text-text-tertiary hover:text-text-primary"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        
        <div className="w-full md:w-1/2 bg-surface-sunken p-6 flex items-center justify-center">
            {images[0] && <Image src={images[0]} alt={product.name} width={400} height={400} className="object-contain" />}
        </div>
        
        <div className="w-full md:w-1/2 p-8 overflow-y-auto">
          <h2 className="text-2xl font-bold text-text-primary mb-2">{product.name}</h2>
          <div className="text-2xl font-bold text-text-primary mb-4">
            <PriceDisplay amountMinorUnits={product.price} listMinorUnits={product.listPrice} currencyCode={product.currencyCode} size="lg" />
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-border rounded-md">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2">-</button>
                <span className="px-3 py-2 font-bold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.inventoryCount ?? 99, quantity + 1))} className="px-3 py-2">+</button>
            </div>
            <Button onClick={() => {
                cart.addItem({ productId: product.id, name: product.name, slug: product.slug, image: product.thumbnail, unitPriceMinorUnits: product.price, listPriceMinorUnits: product.listPrice, currencyCode: product.currencyCode, quantity, categoryId: product.categoryId });
                onClose();
            }}>Add to Cart</Button>
          </div>
          <Button variant="outline" onClick={() => wishlist.toggle({ productId: product.id, name: product.name, slug: product.slug, image: product.thumbnail, unitPriceMinorUnits: product.price, listPriceMinorUnits: product.listPrice, currencyCode: product.currencyCode })}>
            {wishlist.has(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </Button>
        </div>
      </div>
    </div>
  );
}
