import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface VendorCardProps {
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    logo?: string;
    description?: string;
    rating: number;
    reviewCount: number;
    productCount?: number;
    regions?: string[];
  };
  className?: string;
}

export function VendorCard({ vendor, className }: VendorCardProps) {
  const initials = vendor.storeName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <article className={cn('card p-5 flex flex-col hover:shadow-card-hover transition-shadow', className)} data-testid="vendor-card">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ember to-ember-deep text-white grid place-items-center font-bold text-sm overflow-hidden shrink-0">
          {vendor.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.logo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-charcoal flex items-center gap-1 truncate">
            <Link href={`/vendors/${vendor.slug}`} className="hover:text-tealink-hover hover:underline">
              {vendor.storeName}
            </Link>
            <svg className="w-3.5 h-3.5 text-tealink shrink-0" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Verified seller">
              <path d="M12 2l2.4 2.4 3.4-.5.5 3.4L21 9.6 19.5 12 21 14.4l-2.7 2.3-.5 3.4-3.4-.5L12 22l-2.4-2.4-3.4.5-.5-3.4L3 14.4 4.5 12 3 9.6l2.7-2.3.5-3.4 3.4.5L12 2zm-1 13.4l5-5-1.4-1.4-3.6 3.58-1.6-1.6L8 12.6l3 2.8z"/>
            </svg>
          </h3>
          <p className="text-2xs text-smoke-500 mt-0.5">
            ★ {vendor.rating > 0 ? vendor.rating.toFixed(1) : 'New'} · {vendor.reviewCount.toLocaleString()} reviews
          </p>
        </div>
      </div>

      {vendor.description && (
        <p className="mt-3 text-xs text-smoke-500 line-clamp-2 leading-relaxed">{vendor.description}</p>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {vendor.productCount !== undefined && (
          <span className="text-2xs text-charcoal font-medium">{vendor.productCount.toLocaleString()} products</span>
        )}
        {vendor.regions && vendor.regions.length > 0 && (
          <span className="flex gap-1 flex-wrap">
            {vendor.regions.slice(0, 5).map(r => (
              <span key={r} className="px-1.5 py-px rounded-xs bg-smoke-100 text-2xs font-semibold text-smoke-600 uppercase">
                {r}
              </span>
            ))}
            {vendor.regions.length > 5 && <span className="text-2xs text-smoke-400">+{vendor.regions.length - 5}</span>}
          </span>
        )}
      </div>

      <Link href={`/vendors/${vendor.slug}`} className="btn btn-outline btn-sm mt-4 w-full">
        Visit Store
      </Link>
    </article>
  );
}

export interface StorefrontHeroProps {
  vendor: {
    storeName: string;
    slug: string;
    banner?: string;
    logo?: string;
    rating: number;
    reviewCount: number;
    verified?: boolean;
    productCount?: number;
  };
}

export function StorefrontHero({ vendor }: StorefrontHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-smoke-150 bg-surface-raised">
      <div className={cn('h-40 md:h-52 relative', !vendor.banner && 'bg-gradient-to-r from-charcoal via-charcoal-light to-charcoal-mid')}>
        {vendor.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vendor.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="px-5 md:px-8 pb-5 -mt-10 relative">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-20 h-20 rounded-xl bg-surface-raised border border-smoke-150 shadow-md grid place-items-center overflow-hidden shrink-0">
            {vendor.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-ember">{vendor.storeName.slice(0, 1)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-displaysm font-bold text-white drop-shadow-sm [text-shadow:0_1px_8px_rgba(0,0,0,.6)] -mt-8 md:-mt-9">
              {vendor.storeName}
              {vendor.verified !== false && (
                <svg className="inline-block w-5 h-5 ml-1.5 text-tealink align-text-bottom" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Verified seller">
                  <path d="M12 2l2.4 2.4 3.4-.5.5 3.4L21 9.6 19.5 12 21 14.4l-2.7 2.3-.5 3.4-3.4-.5L12 22l-2.4-2.4-3.4.5-.5-3.4L3 14.4 4.5 12 3 9.6l2.7-2.3.5-3.4 3.4.5L12 2zm-1 13.4l5-5-1.4-1.4-3.6 3.58-1.6-1.6L8 12.6l3 2.8z"/>
                </svg>
              )}
            </h1>
            <p className="text-xs text-white/90 drop-shadow [text-shadow:0_1px_4px_rgba(0,0,0,.8)]">
              ★ {vendor.rating > 0 ? vendor.rating.toFixed(1) : 'New'}
              {' · '}{vendor.reviewCount.toLocaleString()} ratings
              {vendor.productCount !== undefined && ` · ${vendor.productCount.toLocaleString()} products`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
