import { cn } from '@/lib/utils';

interface DeliveryEstimateProps {
  daysMin: number;
  daysMax: number;
  freeShipping?: boolean;
  className?: string;
}

export function DeliveryEstimate({ daysMin, daysMax, freeShipping, className }: DeliveryEstimateProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <svg className="w-4 h-4 text-text-tertiary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
      <span className="text-text-secondary">
        {daysMin === daysMax ? (
          <>Delivery in <strong className="text-text-primary">{daysMin} business days</strong></>
        ) : (
          <>Delivery in <strong className="text-text-primary">{daysMin}–{daysMax} business days</strong></>
        )}
      </span>
      {freeShipping && (
        <span className="inline-flex items-center rounded-full bg-feedback-success/10 text-feedback-success text-xs font-bold px-2 py-0.5">
          FREE
        </span>
      )}
    </div>
  );
}
