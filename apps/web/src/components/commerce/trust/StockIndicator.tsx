import { cn } from '@/lib/utils';

interface StockIndicatorProps {
  inventoryCount: number;
  className?: string;
  showCount?: boolean;
}

export function StockIndicator({ inventoryCount, className, showCount = false }: StockIndicatorProps) {
  if (inventoryCount <= 0) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-feedback-danger font-medium', className)}>
        <span className="w-2 h-2 rounded-full bg-feedback-danger" aria-hidden="true" />
        Out of stock
      </span>
    );
  }

  if (inventoryCount <= 5) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-amber-600 font-medium', className)}>
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
        Only {inventoryCount} left — order soon
      </span>
    );
  }

  if (inventoryCount <= 20) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-feedback-success font-medium', className)}>
        <span className="w-2 h-2 rounded-full bg-feedback-success" aria-hidden="true" />
        In stock
        {showCount && <span className="text-text-secondary">({inventoryCount} available)</span>}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-feedback-success font-medium', className)}>
      <span className="w-2 h-2 rounded-full bg-feedback-success" aria-hidden="true" />
      In stock
      {showCount && <span className="text-text-secondary">({inventoryCount} available)</span>}
    </span>
  );
}
