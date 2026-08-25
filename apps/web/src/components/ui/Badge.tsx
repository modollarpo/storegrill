import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'dark';
export type BadgeSize = 'sm' | 'md';
export type BadgePlacement = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: 'bg-ember-pale text-ember-deep',
  success: 'bg-feedback-success-bg text-feedback-success',
  danger: 'bg-feedback-danger-bg text-feedback-danger',
  warning: 'bg-ember-pale text-ember-deep',
  info: 'bg-feedback-info-bg text-feedback-info',
  neutral: 'bg-smoke-100 text-smoke-600',
  dark: 'bg-charcoal text-white',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-px gap-1',
  md: 'text-xs px-2.5 py-0.5 gap-1.5',
};

export function Badge({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  pulse = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full whitespace-nowrap tabular-nums transition-all',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className
      )}
      {...rest}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          {pulse && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex rounded-full h-full w-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

export interface CounterBadgeProps {
  count: number;
  max?: number;
  showZero?: boolean;
  variant?: BadgeVariant;
  placement?: BadgePlacement;
  className?: string;
  pulseOnChange?: boolean;
  'aria-label'?: string;
}

const PLACEMENT_CLASSES: Record<BadgePlacement, string> = {
  'top-right': '-top-1.5 -right-2',
  'top-left': '-top-1.5 -left-2',
  'bottom-right': '-bottom-1.5 -right-2',
  'bottom-left': '-bottom-1.5 -left-2',
};

const COUNTER_VARIANT_BG: Record<BadgeVariant, string> = {
  primary: 'bg-action-primary text-action-primary-fg',
  success: 'bg-feedback-success text-white',
  danger: 'bg-feedback-danger text-white',
  warning: 'bg-feedback-warning text-white',
  info: 'bg-feedback-info text-white',
  neutral: 'bg-smoke-700 text-white',
  dark: 'bg-charcoal text-white',
};

export function CounterBadge({
  count,
  max = 99,
  showZero = false,
  variant = 'primary',
  placement = 'top-right',
  className,
  pulseOnChange = true,
  'aria-label': ariaLabel,
}: CounterBadgeProps) {
  if (!showZero && count <= 0) return null;
  const display = count > max ? `${max}+` : String(count);
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn(
        'absolute',
        PLACEMENT_CLASSES[placement],
        'z-10 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full grid place-items-center tabular-nums ring-2 ring-surface transition-transform',
        COUNTER_VARIANT_BG[variant],
        'text-[10px] font-extrabold shadow-xs',
        pulseOnChange && 'animate-count-pop',
        className
      )}
    >
      {display}
    </span>
  );
}
