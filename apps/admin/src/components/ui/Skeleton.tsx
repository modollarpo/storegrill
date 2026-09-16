import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('rounded-lg bg-surface-100 animate-pulse', className)} />;
}

export function CardSkeleton({ className }: SkeletonProps) {
  return <div className={cn('h-28 rounded-xl bg-surface-100 animate-pulse', className)} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl shadow-xs overflow-hidden">
      <div className="h-10 bg-surface-50 border-b border-surface-200" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4 px-5 py-3.5 border-b border-surface-50 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
