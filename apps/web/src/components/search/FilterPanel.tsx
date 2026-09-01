'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Select } from '../ui/Select';
import { Drawer } from '../ui/Drawer';

export interface FacetCategory {
  name: string;
  slug: string;
  count?: number;
  children?: FacetCategory[];
}

export interface FacetData {
  categories: FacetCategory[];
  brands: string[];
  vendors: Array<{ id: string; name: string }>;
  maxPriceMinorUnits: number;
  currencySymbol: string;
}

export interface FilterPanelProps {
  facets: FacetData;
  className?: string;
}

export function MobileFilterButton({ facets }: { facets: FacetData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn bg-surface border border-border text-text-primary h-9 px-4 text-sm font-bold rounded-pill shadow-sm hover:bg-surface-sunken">
        Filter products
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Filter products">
        <div className="flex-1 overflow-y-auto p-5">
          <FilterPanel facets={facets} />
        </div>
        <div className="border-t border-border p-4 bg-surface">
          <button type="button" onClick={() => setOpen(false)} className="btn bg-action-primary text-action-primary-fg font-bold h-11 w-full rounded-pill hover:brightness-110">
            Show results
          </button>
        </div>
      </Drawer>
    </>
  );
}

export function FilterPanel({ facets, className }: FilterPanelProps) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showAllBrands, setShowAllBrands] = useState(false);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('page');
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const toggleMulti = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      const current = next.getAll(key);
      next.delete(key);
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      updated.forEach(v => next.append(key, v));
      next.delete('page');
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const activeBrands = params.getAll('brand');
  const activeVendors = params.getAll('vendor');
  const minPrice = params.get('min') ?? '0';
  const maxPrice = params.get('max') ?? String(facets.maxPriceMinorUnits);
  const rating = params.get('rating');

  return (
    <div className={cn('space-y-6', className)} data-testid="filter-panel">
      <FilterGroup title="Category">
        <CategoryTree
          categories={facets.categories}
          activeSlug={params.get('category') ?? ''}
          onPick={slug => updateParam('category', params.get('category') === slug ? null : slug)}
        />
      </FilterGroup>

      <FilterGroup title={`Price`}>
        <RangeSlider
          min={0}
          max={facets.maxPriceMinorUnits}
          minValue={Number(minPrice)}
          maxValue={Number(maxPrice)}
          symbol={facets.currencySymbol}
          onChange={(lo, hi) => {
            const next = new URLSearchParams(params.toString());
            if (lo > 0) next.set('min', String(lo));
            else next.delete('min');
            if (hi < facets.maxPriceMinorUnits) next.set('max', String(hi));
            else next.delete('max');
            next.delete('page');
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
          }}
        />
      </FilterGroup>

      <FilterGroup title="Customer Reviews">
        <div className="space-y-2" role="radiogroup" aria-label="Minimum rating">
          {[4, 3, 2].map(stars => (
            <button
              key={stars}
              type="button"
              role="radio"
              aria-checked={rating === String(stars)}
              onClick={() => updateParam('rating', rating === String(stars) ? null : String(stars))}
              className={cn('flex items-center gap-2 text-sm transition-colors', rating === String(stars) ? 'font-bold text-text-primary' : 'text-text-primary hover:text-action-primary')}
            >
              <span className="text-action-primary tracking-tighter" aria-hidden="true">
                {'★'.repeat(stars)}<span className="text-border-strong">{'★'.repeat(5 - stars)}</span>
              </span>
              <span>& Up</span>
            </button>
          ))}
        </div>
      </FilterGroup>

      {facets.brands.length > 0 && (
        <FilterGroup title="Brand">
          <div className="space-y-2">
            {(showAllBrands ? facets.brands : facets.brands.slice(0, 5)).map(brand => (
              <label key={brand} className="flex items-center gap-3 text-sm cursor-pointer hover:text-action-primary text-text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={activeBrands.includes(brand)}
                  onChange={() => toggleMulti('brand', brand)}
                  className="accent-[var(--color-action-primary)] w-4 h-4 rounded-sm border-border"
                />
                {brand}
              </label>
            ))}
            {facets.brands.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllBrands(s => !s)}
                className="text-xs font-bold text-action-primary hover:brightness-110 hover:underline pt-2"
              >
                {showAllBrands ? 'Show fewer' : `Show all ${facets.brands.length}`}
              </button>
            )}
          </div>
        </FilterGroup>
      )}

      {facets.vendors.length > 0 && (
        <FilterGroup title="Seller">
          <div className="space-y-2">
            {facets.vendors.slice(0, 6).map(v => (
              <label key={v.id} className="flex items-center gap-3 text-sm cursor-pointer hover:text-action-primary text-text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={activeVendors.includes(v.id)}
                  onChange={() => toggleMulti('vendor', v.id)}
                  className="accent-[var(--color-action-primary)] w-4 h-4 rounded-sm border-border"
                />
                <span className="truncate">{v.name}</span>
              </label>
            ))}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Availability & Shipping">
        <div className="space-y-2">
          <CheckParam label="In stock only" param="inStock" params={params} onToggle={toggleMulti} />
          <CheckParam label="Free shipping eligible" param="freeShipping" params={params} onToggle={toggleMulti} />
          <CheckParam label="Express eligible" param="express" params={params} onToggle={toggleMulti} />
        </div>
      </FilterGroup>
    </div>
  );
}

function CheckParam({
  label,
  param,
  params,
  onToggle,
}: {
  label: string;
  param: string;
  params: URLSearchParams;
  onToggle: (key: string, value: string) => void;
}) {
  const checked = params.has(param);
  return (
    <label className="flex items-center gap-3 text-sm cursor-pointer hover:text-action-primary text-text-primary transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(param, '1')}
        className="accent-[var(--color-action-primary)] w-4 h-4 rounded-sm border-border"
      />
      {label}
    </label>
  );
}

function CategoryTree({
  categories,
  activeSlug,
  onPick,
  depth = 0,
}: {
  categories: FacetCategory[];
  activeSlug: string;
  onPick: (slug: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth === 0 ? 'space-y-1.5' : 'ml-3 pl-2 border-l border-border space-y-0.5 mt-0.5'}>
      {categories.map(cat => {
        const active = activeSlug === cat.slug;
        return (
          <li key={cat.slug}>
            <button
              type="button"
              onClick={() => onPick(cat.slug)}
              aria-pressed={active}
              className={cn(
                'w-full text-left py-1 flex items-center justify-between group transition-colors',
                depth > 0 ? 'text-[13px]' : 'text-sm',
                active ? 'text-action-primary font-bold' : 'text-text-primary hover:text-action-primary'
              )}
            >
              <span className={cn(active && 'underline underline-offset-4', 'group-hover:underline underline-offset-4 truncate')}>{cat.name}</span>
              {cat.count !== undefined && <span className="text-xs text-text-tertiary ml-2">({cat.count})</span>}
            </button>
            {cat.children && cat.children.length > 0 && (
              <CategoryTree categories={cat.children} activeSlug={activeSlug} onPick={onPick} depth={depth + 1} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="text-sm font-bold text-text-primary mb-3 border-b border-border pb-1.5">{title}</h3>
      {children}
    </section>
  );
}

interface RangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  symbol: string;
  onChange: (minValue: number, maxValue: number) => void;
}

export function RangeSlider({ min, max, minValue, maxValue, symbol, onChange }: RangeSliderProps) {
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);

  const pctLo = ((localMin - min) / Math.max(1, max - min)) * 100;
  const pctHi = ((localMax - min) / Math.max(1, max - min)) * 100;

  function format(v: number): string {
    return `${symbol}${Math.round(v / 100).toLocaleString()}`;
  }

  function commit() {
    onChange(Math.min(localMin, localMax), Math.max(localMin, localMax));
  }

  return (
    <div data-testid="price-range-slider" className="px-1 mt-4">
      <div className="relative h-6 mb-3">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-border" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-action-primary"
          style={{ left: `${pctLo}%`, right: `${100 - pctHi}%` }}
        />
        <input
          type="range"
          role="slider"
          aria-label="Minimum price"
          min={min}
          max={max}
          step={50}
          value={Math.min(localMin, localMax)}
          onChange={e => setLocalMin(Number(e.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface-raised [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-action-primary [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-surface-raised [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-action-primary [&::-moz-range-thumb]:shadow-md"
        />
        <input
          type="range"
          role="slider"
          aria-label="Maximum price"
          min={min}
          max={max}
          step={50}
          value={Math.max(localMin, localMax)}
          onChange={e => setLocalMax(Number(e.target.value))}
          onMouseUp={commit}
          onTouchEnd={commit}
          onKeyUp={commit}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface-raised [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-action-primary [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-surface-raised [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-action-primary [&::-moz-range-thumb]:shadow-md"
        />
      </div>
      <p className="text-xs font-medium text-text-secondary text-center">
        {format(localMin)} – {format(localMax) === format(max) ? `${format(max)}+` : format(max)}
      </p>
    </div>
  );
}

export function ActiveFilterChips() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  if ([...params.keys()].length === 0) return null;

  function remove(key: string, value?: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      const remaining = next.getAll(key).filter(v => v !== value);
      next.delete(key);
      remaining.forEach(v => next.append(key, v));
    } else {
      next.delete(key);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const chips: Array<{ key: string; value?: string; label: string }> = [];
  for (const [key, value] of params.entries()) {
    if (['page'].includes(key)) continue;
    chips.push({ key, value, label: value === '1' ? LABELS[key] || key : `${LABELS[key] || key}: ${value}` });
  }

  return (
    <div className="flex items-center flex-wrap gap-2 mb-5" data-testid="active-filters">
      {chips.map(chip => (
        <button
          key={`${chip.key}-${chip.value ?? ''}`}
          type="button"
          onClick={() => remove(chip.key, chip.value)}
          className="inline-flex items-center gap-1.5 pl-3 pr-2 min-h-[32px] rounded-full bg-action-primary/10 border border-action-primary/20 text-xs font-bold text-action-primary hover:bg-action-primary/20 transition-colors"
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={() => router.replace(pathname, { scroll: false })}
        className="inline-flex items-center min-h-[32px] px-2 text-xs font-bold text-text-tertiary hover:text-text-primary underline underline-offset-4 ml-1 transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}

const LABELS: Record<string, string> = {
  q: 'Search',
  category: 'Category',
  brand: 'Brand',
  vendor: 'Seller',
  min: 'Min price',
  max: 'Max price',
  rating: 'Rating',
  sort: 'Sort',
  inStock: 'In stock',
  freeShipping: 'Free shipping',
  express: 'Express',
};

export function SortDropdown() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = params.get('sort') ?? 'featured';

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sort-select" className="text-sm font-medium text-text-secondary whitespace-nowrap">Sort by:</label>
      <Select
        id="sort-select"
        className="h-11 min-w-[220px] text-sm font-bold bg-surface border-border shadow-sm rounded-full focus:border-action-primary focus:ring-action-primary"
        placeholder="Featured"
        value={value}
        onChange={v => {
          const next = new URLSearchParams(params.toString());
          if (v === 'featured') next.delete('sort');
          else next.set('sort', v);
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        options={[
          { value: 'featured', label: 'Featured' },
          { value: 'price_asc', label: 'Price: Low to High' },
          { value: 'price_desc', label: 'Price: High to Low' },
          { value: 'rating', label: 'Avg. Customer Review' },
          { value: 'newest', label: 'Newest Arrivals' },
          { value: 'bestselling', label: 'Best Selling' },
        ]}
      />
    </div>
  );
}
