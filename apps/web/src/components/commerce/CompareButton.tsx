'use client';

import { useCompareStore } from '../../store/useCompareStore';

export function CompareButton({ productId, className }: { productId: string; className?: string }) {
  const { productIds, toggleProduct } = useCompareStore();
  const isCompared = productIds.includes(productId);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleProduct(productId);
      }}
      className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isCompared ? 'text-ember' : 'text-text-tertiary hover:text-text-primary'} ${className || ''}`}
      aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
      title={isCompared ? 'Remove from compare' : 'Add to compare'}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5 3 12m0 0 7.5 7.5M3 12h18" />
      </svg>
      <span className="hidden sm:inline">{isCompared ? 'Compared' : 'Compare'}</span>
    </button>
  );
}
