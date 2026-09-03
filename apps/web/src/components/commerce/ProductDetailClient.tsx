'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { storefrontImage } from '@/lib/images';
import { StarRating } from '../StarRating';
import { AddToCartButton } from './AddToCartButton';
import { ProductShare } from './ProductShare';
import { CompareButton } from './CompareButton';
import { useWishlist } from '../providers/WishlistContext';
import { useToast } from '../feedback/Toast';

// Imported PDP sub-components
import { PdpImageGallery } from './pdp/PdpImageGallery';
import { PdpPricing } from './pdp/PdpPricing';
import { PdpVariantSelector } from './pdp/PdpVariantSelector';
import { PdpBuyBox } from './pdp/PdpBuyBox';

export interface PdpVariant {
  id: string;
  name: string;
  sku: string;
  basePriceMinorUnits: number;
  currencyCode?: string;
  images?: string[];
  attributes?: Array<{ name: string; value: string }>;
  stock: number;
}

export interface PdpProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  images?: string[];
  thumbnail?: string;
  price: number;
  listPrice?: number;
  listPriceMinorUnits?: number;
  basePriceMinorUnits: number;
  currencyCode: string;
  rating: number;
  reviewCount: number;
  inventoryCount?: number;
  expressEligible?: boolean;
  vendor?: { storeName: string; slug: string; rating?: number; returnPolicy?: string } | null;
  brand?: { name: string } | null;
  category?: { name: string; slug: string } | null;
  variants?: PdpVariant[];
}

export interface ProductDetailClientProps {
  product: PdpProduct;
  shipping: { freeThresholdMinorUnits: number; daysMin: number; daysMax: number };
  locale?: string;
  tabs: { description: React.ReactNode; specs: React.ReactNode; shippingInfo: React.ReactNode; reviews: React.ReactNode };
}

export function ProductDetailClient({ product, shipping, locale = 'en-US', tabs }: ProductDetailClientProps) {
  const images = useMemo(() => {
    const variantImages = product.variants?.flatMap(v => v.images || []) || [];
    return [...(product.images || []), ...variantImages].map(storefrontImage).filter((image): image is string => Boolean(image));
  }, [product]);

  const [variantId, setVariantId] = useState<string | undefined>(() => {
    if (!product.variants?.length) return undefined;
    const first = product.variants.find(v => v.stock > 0) ?? product.variants[0];
    return first.id;
  });

  const variant = product.variants?.find(v => v.id === variantId);
  const activeUnitPrice = variant?.basePriceMinorUnits ?? product.price;
  const currency = variant?.currencyCode ?? product.currencyCode;
  const stock = variant ? variant.stock : product.inventoryCount;
  const listPrice = product.listPrice ?? product.listPriceMinorUnits;

  const variantPrices = product.variants?.map(v => v.basePriceMinorUnits) ?? [];
  const variantMin = variantPrices.length ? Math.min(...variantPrices) : undefined;
  const variantMax = variantPrices.length ? Math.max(...variantPrices) : undefined;
  const priceRangeDiffer = variantMin !== undefined && variantMax !== undefined && variantMin !== variantMax;
  const showPriceRange = priceRangeDiffer && !variant;

  const discountPct =
    listPrice && listPrice > activeUnitPrice
      ? Math.round(((listPrice - activeUnitPrice) / listPrice) * 100)
      : 0;

  const freeShipEligible = activeUnitPrice >= shipping.freeThresholdMinorUnits;

  const getAttr = (v: PdpVariant, name: string): string | undefined =>
    v.attributes?.find(a => a.name.toLowerCase() === name)?.value;

  const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_640px] gap-4 lg:gap-5">
      {/* -- Image Gallery -- */}
      <PdpImageGallery images={images} productName={product.name} discountPct={discountPct} />

      {/* -- Buy Box -- */}
      <div className="min-w-0 lg:sticky lg:top-28 lg:self-start bg-surface border border-border rounded-2xl p-6 shadow-sm" id="buybox">
        {product.vendor && (
          <p className="text-sm text-text-secondary mb-2">
            Sold by{' '}
            <Link href={`/vendors/${product.vendor.slug}`} className="text-action-primary font-bold hover:underline">
              {product.vendor.storeName}
            </Link>
          </p>
        )}

        <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary leading-snug mb-3">{product.name}</h1>
        
        <a href="#reviews-tab" className="inline-flex items-center gap-2 mb-6 group">
          <StarRating rating={product.rating} showCount={false} />
          <span className="text-sm font-bold text-action-primary hover:underline underline-offset-4">
            {product.reviewCount.toLocaleString()} ratings
          </span>
        </a>

        {/* Price block */}
        <PdpPricing 
          activeUnitPrice={activeUnitPrice} 
          currency={currency} 
          listPrice={listPrice} 
          discountPct={discountPct}
          fromMinorUnits={showPriceRange ? variantMin : undefined}
          toMinorUnits={showPriceRange ? variantMax : undefined}
          locale={locale}
          formatMoney={formatMoney}
        />

        {/* Variant Selectors */}
        <PdpVariantSelector 
          variants={product.variants} 
          selectedVariantId={variantId} 
          onSelectVariant={setVariantId}
          getAttr={getAttr}
        />

        {/* Stock status */}
        <p className={cn('text-sm font-bold flex items-center gap-2 mt-6', stock && stock > 0 ? 'text-feedback-success' : 'text-feedback-danger')} role="status">
          {stock && stock > 0 ? (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          )}
          {!stock || stock <= 0 ? 'Currently unavailable' : stock <= 3 ? `Only ${stock} left in stock — order soon` : 'In stock — ready to ship'}
        </p>

        {/* Buy Box - CTA Section */}
        <div className="mt-5">
          <PdpBuyBox
             product={product}
             variant={variant}
             variantId={variantId}
             images={images}
             activeUnitPrice={activeUnitPrice}
             currency={currency}
             stock={stock}
          />
        </div>
        
        {product.shortDescription && (
          <p className="mt-4 text-sm text-text-secondary leading-relaxed border-l-2 border-action-primary/30 pl-3">
            {product.shortDescription}
          </p>
        )}
      </div>

      {/* -- Tabs (below gallery, matching image box width) -- */}
      <div className="min-w-0 mt-6 bg-surface border border-border rounded-2xl p-6 shadow-sm">{tabs.description}</div>
    </div>
  );
}
