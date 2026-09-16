import { cn } from '@/lib/utils';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200/60',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200/60',
  PAID: 'bg-blue-50 text-blue-700 border-blue-200/60',
  PROCESSING: 'bg-amber-50 text-amber-700 border-amber-200/60',
  SHIPPED: 'bg-sky-50 text-sky-700 border-sky-200/60',
  IN_TRANSIT: 'bg-sky-50 text-sky-700 border-sky-200/60',
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200/60',
  REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200/60',
  FAILED: 'bg-red-50 text-red-700 border-red-200/60',
  ERROR: 'bg-red-50 text-red-700 border-red-200/60',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  RUNNING: 'bg-blue-50 text-blue-700 border-blue-200/60',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  INACTIVE: 'bg-surface-50 text-surface-500 border-surface-200',
  DRAFT: 'bg-surface-50 text-surface-500 border-surface-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200/60',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200/60',
  REJECTED: 'bg-red-50 text-red-700 border-red-200/60',
  PENDING_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  UNDER_REVIEW: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold uppercase tracking-wider border rounded-md whitespace-nowrap tabular-nums',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        STATUS_STYLES[status] ?? 'bg-surface-50 text-surface-600 border-surface-200'
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}