'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ProductCard, type ProductCardData } from './ProductCard';

type ListingView = 'grid' | 'list';

const STORAGE_KEY = 'storegrill:plp-view';

export function ProductListingViews({ products, locale }: { products: ProductCardData[]; locale?: string }) {
  const [view, setView] = useState<ListingView>('grid');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'list' || stored === 'grid') setView(stored);
    } catch {
      // storage unavailable (private browsing)
    }
  }, []);

  function select(next: ListingView) {
    setView(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable (private browsing)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4" role="group" aria-label="Product view">
        <span className="text-sm font-medium text-text-secondary mr-3 hidden sm:inline">View:</span>
        <div className="flex bg-surface rounded-md border border-border shadow-sm p-0.5">
          <ViewButton active={view === 'grid'} onClick={() => select('grid')} label="Grid view">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="3" y="3" width="8" height="8" rx="1.5" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" />
            </svg>
          </ViewButton>
          <ViewButton active={view === 'list'} onClick={() => select('list')} label="List view">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="3" y="4.5" width="18" height="3.5" rx="1" />
              <rect x="3" y="10.5" width="18" height="3.5" rx="1" />
              <rect x="3" y="16.5" width="18" height="3.5" rx="1" />
            </svg>
          </ViewButton>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {products.map(product => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="product-list-view">
          {products.map(product => (
            <ProductCard key={product.id} product={product} variant="list" locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function ViewButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'w-9 h-9 grid place-items-center rounded-sm transition-all duration-200',
        active
          ? 'bg-action-primary text-action-primary-fg shadow-sm relative z-10'
          : 'bg-transparent text-text-tertiary hover:text-text-primary hover:bg-surface-sunken'
      )}
    >
      {children}
    </button>
  );
}
