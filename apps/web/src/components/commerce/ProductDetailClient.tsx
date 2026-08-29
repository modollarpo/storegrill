'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '../providers/WishlistContext';
import { useToast } from '../feedback/Toast';
import { PriceDisplay } from './PriceDisplay';
import { AddToCartButton } from './AddToCartButton';
import { StarRating } from '../StarRating';
import { cn } from '@/lib/utils';
import { storefrontImage } from '@/lib/images';

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

  const [activeImage, setActiveImage] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [variantId, setVariantId] = useState<string | undefined>(product.variants && product.variants.length === 1 ? product.variants[0].id : undefined);
  const [quantity, setQuantity] = useState(1);

  const variant = product.variants?.find(v => v.id === variantId);
  const activeUnitPrice = variant?.basePriceMinorUnits ?? product.price;
  const currency = variant?.currencyCode ?? product.currencyCode;
  const stock = variant ? variant.stock : product.inventoryCount;

  const getAttr = (v: PdpVariant, name: string): string | undefined =>
    v.attributes?.find(a => a.name.toLowerCase() === name)?.value;

  const colorOptions = useMemo(() => {
    const colors = new Map<string, string[]>();
    for (const v of product.variants || []) {
      const color = getAttr(v, 'color') || getAttr(v, 'colour');
      if (color) colors.set(color, v.images || []);
    }
    return [...colors.keys()];
  }, [product.variants]);

  const sizeOptions = useMemo(() => {
    const sizes: string[] = [];
    for (const v of product.variants || []) {
      const size = getAttr(v, 'size');
      if (size && !sizes.includes(size)) sizes.push(size);
    }
    return sizes;
  }, [product.variants]);

  const discountPct =
    product.listPrice && product.listPrice > activeUnitPrice
      ? Math.round(((product.listPrice - activeUnitPrice) / product.listPrice) * 100)
      : 0;

  const freeShipEligible = activeUnitPrice >= shipping.freeThresholdMinorUnits;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[55%_1fr] gap-10">
      {/* -- Image Gallery -- */}
      <div className="flex flex-col gap-4">
        <div
          className="relative w-full aspect-square border border-border rounded-xs overflow-hidden bg-white shadow-sm group cursor-zoom-in"
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
        >
          {images.length > 0 ? (
            <Image
              src={images[activeImage]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 55vw"
              priority
              className="object-contain p-10 mix-blend-multiply transition-transform duration-300"
              style={zoom ? { transform: 'scale(2.5)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-surface-sunken text-text-tertiary font-bold text-5xl">
              {product.name.slice(0, 1)}
            </div>
          )}

          {discountPct > 0 && (
            <span className="absolute top-4 left-4 px-2.5 py-1 rounded-sm bg-action-primary text-white text-sm font-bold shadow">
              -{discountPct}%
            </span>
          )}
        </div>

        {images.length > 1 && (
          <ul className="flex gap-3 overflow-x-auto scrollbar-none snap-x pb-1" role="list" aria-label="Product images">
            {images.slice(0, 8).map((img, i) => (
              <li key={img} className="snap-start shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1} of ${product.name}`}
                  aria-current={i === activeImage}
                  className={cn(
                    'relative w-20 h-20 rounded-xs border-2 overflow-hidden bg-white transition-all',
                    i === activeImage
                      ? 'border-action-primary ring-2 ring-action-primary/20'
                      : 'border-border hover:border-action-primary'
                  )}
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-contain p-2 mix-blend-multiply" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* -- Buy Box -- */}
      <div className="min-w-0 lg:sticky lg:top-28 lg:self-start bg-surface border border-border rounded-xs p-6" id="buybox">
        {product.vendor && (
          <p className="text-sm text-text-secondary mb-1">
            Sold by{' '}
            <Link href={`/vendors/${product.vendor.slug}`} className="text-action-primary hover:underline font-bold">
              {product.vendor.storeName}
            </Link>
            {typeof product.vendor.rating === 'number' && product.vendor.rating > 0 && (
              <span className="ml-2 font-bold text-action-primary">★ {product.vendor.rating.toFixed(1)}</span>
            )}
          </p>
        )}

        {product.brand?.name && (
          <p className="text-sm text-text-secondary mb-2">
            Brand:{' '}
            <Link
              href={`/products?q=${encodeURIComponent(product.brand.name)}`}
              className="font-bold text-action-primary hover:underline"
            >
              {product.brand.name}
            </Link>
          </p>
        )}

        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary leading-tight tracking-tight">{product.name}</h1>

        <a href="#reviews-tab" className="inline-flex items-center gap-2 mt-3 group" aria-label={`Rated ${product.rating.toFixed(1)} out of 5`}>
          <StarRating rating={product.rating} showCount={false} />
          <span className="text-sm font-bold text-action-primary group-hover:underline underline-offset-2">
            ({product.reviewCount.toLocaleString()} ratings)
          </span>
        </a>

        <hr className="my-5 border-border" />

        {/* Price block */}
        <div className="flex flex-col gap-1.5">
          <span className="text-4xl font-black text-text-primary">
            <PriceDisplay amountMinorUnits={activeUnitPrice} currencyCode={currency} size="xl" locale={locale} />
          </span>
          {discountPct > 0 && (
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              <span className="text-sm text-text-tertiary line-through">Was {formatMoney(product.listPrice!, currency)}</span>
              <span className="text-sm text-action-primary font-extrabold">
                Save {formatMoney(product.listPrice! - activeUnitPrice, currency)} ({discountPct}%)
              </span>
            </div>
          )}
        </div>

        {product.shortDescription && (
          <p className="mt-4 text-sm text-text-secondary leading-relaxed border-l-2 border-action-primary/30 pl-3">
            {product.shortDescription}
          </p>
        )}

        {/* Colour selector */}
        {colorOptions.length > 0 && (
          <fieldset className="mt-6">
            <legend className="text-sm font-bold text-text-primary mb-3">Colour</legend>
            <div className="flex flex-wrap gap-2.5">
              {colorOptions.map(color => (
                <button
                  key={color}
                  type="button"
                  aria-pressed={variant?.attributes?.some(a => a.value === color)}
                  onClick={() => selectByAttribute('color', color)}
                  className="px-4 py-2 rounded-xs border border-border-strong text-sm font-bold hover:border-action-primary transition-colors aria-pressed:border-action-primary aria-pressed:bg-action-primary aria-pressed:text-white aria-pressed:border-action-primary"
                >
                  {color}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Size selector */}
        {sizeOptions.length > 0 && (
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-text-primary mb-3">Size</legend>
            <div className="flex flex-wrap gap-2.5">
              {sizeOptions.map(size => {
                const available = product.variants?.some(
                  v => v.attributes?.some(a => a.value.toLowerCase() === size.toLowerCase()) && v.stock > 0
                );
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!available}
                    aria-disabled={!available}
                    onClick={() => selectByAttribute('size', size)}
                    className={cn(
                      'min-w-[3rem] px-4 py-2 rounded-xs border text-sm font-bold transition-colors',
                      available
                        ? 'border-border-strong hover:border-action-primary aria-pressed:border-action-primary aria-pressed:bg-action-primary aria-pressed:text-white'
                        : 'border-border text-text-tertiary line-through cursor-not-allowed opacity-50'
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {/* Generic variant dropdown */}
        {product.variants && product.variants.length > 0 && !colorOptions.length && !sizeOptions.length && (
          <fieldset className="mt-6">
            <legend className="text-sm font-bold text-text-primary mb-3">Option</legend>
            <select
              aria-label="Select option"
              value={variantId ?? ''}
              onChange={e => setVariantId(e.target.value || undefined)}
              className="input max-w-xs h-12 text-sm font-bold bg-surface"
            >
              <option value="">Choose an option…</option>
              {product.variants.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </fieldset>
        )}

        {/* Stock status */}
        <p className={cn('text-sm font-bold flex items-center gap-2 mt-6', stock && stock > 0 ? 'text-feedback-success' : 'text-feedback-danger')} role="status">
          {stock && stock > 0 ? (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          )}
          {!stock || stock <= 0 ? 'Currently unavailable' : stock <= 3 ? `Only ${stock} left in stock — order soon` : 'In stock — ready to ship'}
        </p>

        {/* CTA Box */}
        <div className="mt-5 space-y-3 bg-surface-sunken p-5 rounded-xs border border-border">
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
            <>
              <AddToCartButton
                productId={product.id}
                variantId={variantId}
                name={product.name}
                slug={product.slug}
                image={images[0]}
                unitPriceMinorUnits={activeUnitPrice}
                currencyCode={currency}
                quantity={quantity}
                stock={stock}
                vendorName={product.vendor?.storeName}
                label="Add to basket"
                size="lg"
                fullWidth
              />
              <AddToCartButton
                mode="buynow"
                productId={product.id}
                variantId={variantId}
                name={product.name}
                slug={product.slug}
                image={images[0]}
                unitPriceMinorUnits={activeUnitPrice}
                currencyCode={currency}
                quantity={quantity}
                stock={stock}
                vendorName={product.vendor?.storeName}
                size="lg"
                fullWidth
              />
            </>
          ) : (
            <NotifyMe productId={product.id} />
          )}

          <div className="pt-2">
            <WishlistShare product={product} />
          </div>
        </div>

        {/* Trust badges */}
        <ul className="mt-5 space-y-2.5 text-sm text-text-secondary font-medium" aria-label="Purchase protections">
          <li className="flex items-center gap-3">
            <svg className="w-5 h-5 text-feedback-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"/></svg>
            Secure checkout with Stripe & PayPal
          </li>
          <li className="flex items-center gap-3">
            <svg className="w-5 h-5 text-feedback-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
            Free 30-day returns - free for faulty or incorrect items; change-of-mind returns at sender&apos;s cost
          </li>
          <li className="flex items-center gap-3">
            <svg className="w-5 h-5 text-feedback-success shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Authentic products from verified sellers
          </li>
        </ul>

        {/* Delivery info */}
        <section className="mt-5 rounded-xs border border-border bg-surface p-5 shadow-sm" aria-label="Delivery information">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <svg className="w-4 h-4 text-action-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>
            Delivery
          </h2>
          <p className="text-sm text-text-secondary mt-2 leading-relaxed">
            {freeShipEligible ? (
              <><strong className="text-feedback-success font-extrabold">FREE delivery</strong> on this order · </>
            ) : (
              <>Free delivery over threshold · </>
            )}
            Arrives in <strong className="text-text-primary">{shipping.daysMin}–{shipping.daysMax} days</strong>.
          </p>
          <p className="text-xs text-text-secondary mt-2">
            Orders ship from our fulfilment centres - international deliveries may be subject to import duties and taxes, which are the recipient&apos;s responsibility.
          </p>
          {product.vendor?.returnPolicy && (
            <p className="text-xs text-text-secondary mt-2">Returns: {product.vendor.returnPolicy}</p>
          )}
        </section>
      </div>

      {/* -- Tabs (full width) -- */}
      <div className="lg:col-span-2 mt-6">{tabs.description}</div>
    </div>
  );

  function selectByAttribute(name: 'color' | 'colour' | 'size', value: string) {
    const match = product.variants?.find(
      v =>
        v.stock > 0 &&
        v.attributes?.some(a => a.name.toLowerCase().includes(name) && a.value.toLowerCase() === value.toLowerCase())
    );
    if (match) setVariantId(match.id);
  }
}

function formatMoney(minor: number, currency: string): string {
  const decimals = currency === 'JPY' ? 0 : 2;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: decimals }).format(minor / 10 ** decimals);
  } catch {
    return `${minor / 10 ** decimals} ${currency}`;
  }
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
      className="flex gap-2 max-w-md"
    >
      <label htmlFor={`notify-${productId}`} className="sr-only">Email for restock notification</label>
      <input
        id={`notify-${productId}`}
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email me when available"
        className="input h-11 flex-1 rounded-xs px-4 text-sm border-border focus:border-action-primary"
      />
      <button type="submit" className="h-11 px-6 shrink-0 rounded-xs text-sm font-bold bg-action-primary text-action-primary-fg hover:bg-action-primary-hover transition-colors">
        Notify Me
      </button>
    </form>
  );
}

function WishlistShare({ product }: { product: PdpProduct }) {
  const { toast } = useToast();
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {
        // user dismissed
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ variant: 'success', title: 'Link copied' });
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          wishlist.toggle({
            productId: product.id,
            name: product.name,
            slug: product.slug,
            image: product.thumbnail,
            unitPriceMinorUnits: product.price,
            currencyCode: product.currencyCode,
          });
          toast({ variant: saved ? 'info' : 'success', title: saved ? 'Removed from wishlist' : 'Saved to wishlist' });
        }}
        className={cn(
          'h-10 px-4 rounded-xs text-sm font-bold flex items-center gap-2 border transition-colors',
          saved
            ? 'border-action-primary text-action-primary bg-action-primary/5'
            : 'border-border-strong text-text-primary hover:border-action-primary hover:text-action-primary bg-surface'
        )}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
        {saved ? 'Saved' : 'Save'}
      </button>
      <button
        type="button"
        onClick={share}
        className="h-10 px-4 rounded-xs text-sm font-bold text-text-primary hover:bg-surface-sunken transition-colors flex items-center gap-2 border border-border-strong"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
        Share
      </button>
    </div>
  );
}
