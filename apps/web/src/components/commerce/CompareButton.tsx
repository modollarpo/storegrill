'use client';

import { useCompareStore, MAX_COMPARE } from '@/store/useCompareStore';
import { useRegion } from '@/components/providers/RegionContext';
import { useToast } from '@/components/feedback/Toast';
import { t } from '@/i18n';

export function CompareButton({ productId, className }: { productId: string; className?: string }) {
  const { productIds, toggleProduct } = useCompareStore();
  const { language } = useRegion();
  const { toast } = useToast();
  const isCompared = productIds.includes(productId);
  const atLimit = !isCompared && productIds.length >= MAX_COMPARE;

  const label = isCompared ? t(language, 'compareRemove') : t(language, 'compareAdd');

  return (
    <button
      type="button"
      aria-pressed={isCompared}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        const result = toggleProduct(productId);
        if (result === 'at-limit') {
          toast({
            variant: 'error',
            title: t(language, 'compareLimitTitle'),
            description: t(language, 'compareLimitBody', MAX_COMPARE),
          });
        }
      }}
      className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isCompared ? 'text-ember' : 'text-text-tertiary hover:text-text-primary'} ${className || ''}`}
      aria-label={label}
      title={atLimit ? t(language, 'compareLimitTitle') : label}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5 3 12m0 0 7.5 7.5M3 12h18" />
      </svg>
      <span className="hidden sm:inline">{isCompared ? t(language, 'compareCompared') : t(language, 'compareAddShort')}</span>
    </button>
  );
}
