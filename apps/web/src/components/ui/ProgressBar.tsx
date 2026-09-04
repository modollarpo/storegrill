import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const TONE_TRACK: Record<string, string> = {
  default: 'bg-action-primary',
  success: 'bg-feedback-success',
  warning: 'bg-feedback-warning',
  danger:  'bg-feedback-danger',
};

const SIZE_CLASS: Record<string, string> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = 'default',
  size = 'md',
  animated = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-bold text-text-secondary">{label}</span>
          )}
          {showValue && (
            <span className="text-xs font-black text-text-primary tabular-nums">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className={cn(
          'w-full bg-surface-sunken rounded-full overflow-hidden',
          SIZE_CLASS[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            TONE_TRACK[tone],
            animated && 'animate-pulse'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface FreeShippingBarProps {
  currentMinorUnits: number;
  thresholdMinorUnits: number;
  currencySymbol?: string;
  className?: string;
}

export function FreeShippingBar({
  currentMinorUnits,
  thresholdMinorUnits,
  currencySymbol = '£',
  className,
}: FreeShippingBarProps) {
  const remaining = Math.max(0, thresholdMinorUnits - currentMinorUnits);
  const pct = Math.min(100, (currentMinorUnits / thresholdMinorUnits) * 100);
  const done = remaining === 0;

  const fmt = (minor: number) =>
    `${currencySymbol}${(minor / 100).toFixed(2)}`;

  return (
    <div className={cn('p-4 rounded-xl bg-surface-sunken border border-border', className)}>
      <div className="flex items-center gap-2 mb-2">
        <svg className={cn('w-4 h-4 shrink-0', done ? 'text-feedback-success' : 'text-text-tertiary')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {done
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          }
        </svg>
        <p className="text-sm font-bold text-text-primary">
          {done
            ? 'You qualify for FREE delivery!'
            : <><span className="text-action-primary font-black">{fmt(remaining)}</span> more for FREE delivery</>
          }
        </p>
      </div>
      <ProgressBar value={pct} max={100} tone={done ? 'success' : 'default'} size="sm" />
    </div>
  );
}
