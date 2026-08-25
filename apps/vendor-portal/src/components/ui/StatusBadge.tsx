import { cn } from '@/lib/utils';

export type OrderStatusName =
  | 'PENDING' | 'CONFIRMED' | 'PAID' | 'PROCESSING'
  | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CONFIRMED: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  PAID: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  PROCESSING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  SHIPPED: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  DELIVERED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  REFUNDED: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  FAILED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  RUNNING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  PENDING_REVIEW: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold ring-1 ring-inset whitespace-nowrap [font-variant-numeric:tabular-nums]',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
