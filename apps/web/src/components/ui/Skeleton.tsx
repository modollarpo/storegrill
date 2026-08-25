import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  lines?: number;
}

const RADIUS_CLASS: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  none: 'rounded-none',
  xs: 'rounded-xs',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
};

export function Skeleton({ width, height, rounded = 'md', lines, className, style, ...rest }: SkeletonProps) {
  const radiusClass = RADIUS_CLASS[rounded];

  if (lines && lines > 1) {
    return (
      <div className={cn('space-y-2', className)} aria-hidden="true" role="presentation" {...rest}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('bg-surface-sunken bg-shimmer bg-[length:200%_100%] animate-shimmer', i === lines - 1 ? 'w-3/4' : 'w-full', radiusClass)}
            style={{ height: height ?? '0.875rem' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={cn('bg-surface-sunken bg-shimmer bg-[length:200%_100%] animate-shimmer', radiusClass, className)}
      style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height, ...style }}
      {...rest}
    />
  );
}

export function SkeletonProductCard() {
  return (
    <div className="bg-surface rounded-lg border border-border p-3 space-y-4" data-testid="skeleton-product-card">
      <Skeleton height={200} className="w-full" rounded="xs" />
      <div className="space-y-2">
        <Skeleton width="90%" height="0.875rem" rounded="sm" />
        <Skeleton width="60%" height="0.875rem" rounded="sm" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton width="40%" height="1.5rem" rounded="md" />
        <Skeleton width="2rem" height="2rem" rounded="full" />
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </div>
  );
}
