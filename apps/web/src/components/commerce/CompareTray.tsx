'use client';

import Link from 'next/link';
import { useCompareStore, MAX_COMPARE } from '@/store/useCompareStore';
import { useRegion } from '@/components/providers/RegionContext';
import { t } from '@/i18n';

/**
 * Persistent entry point to the compare view.
 *
 * Compare is a two-step flow: shoppers tick products on cards, then have to
 * reach a page that actually tabulates them. Without a visible tray the
 * selection is a dead end, so the compare page appeared not to exist.
 */
export function CompareTray() {
  const { productIds, removeProduct, clearCompare } = useCompareStore();
  const { language } = useRegion();

  if (productIds.length === 0) return null;

  return (
    <div
      data-testid="compare-tray"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-lg lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-[min(680px,calc(100%-2rem))] lg:-translate-x-1/2 lg:rounded-lg lg:border"
    >
      <div className="container-site flex items-center gap-3 py-3 lg:px-4">
        <p className="text-sm font-semibold text-text-primary shrink-0">
          {t(language, 'compareTrayCount', productIds.length, MAX_COMPARE)}
        </p>

        <ul className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {productIds.map(id => (
            <li key={id} className="shrink-0">
              <button
                type="button"
                onClick={() => removeProduct(id)}
                aria-label={t(language, 'compareTrayRemove')}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs font-bold text-text-secondary transition-colors hover:border-ember hover:text-ember"
              >
                {id.slice(0, 2).toUpperCase()}
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={clearCompare}
          className="shrink-0 text-xs font-semibold text-text-tertiary underline underline-offset-2 hover:text-text-primary"
        >
          {t(language, 'compareTrayClear')}
        </button>

        <Link href="/compare" className="btn btn-primary shrink-0 text-sm">
          {t(language, 'compareTrayAction')}
        </Link>
      </div>
    </div>
  );
}
