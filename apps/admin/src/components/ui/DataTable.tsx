import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | null;
  rowKey: (row: T) => string;
  minWidth?: number;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  loadingRows?: number;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  minWidth,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'No results match your current filters.',
  emptyAction,
  onRowClick,
  loadingRows = 5,
}: DataTableProps<T>) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl shadow-xs overflow-x-auto">
      <table
        className="w-full text-left text-[13px]"
        style={minWidth ? { minWidth } : undefined}
      >
        <thead className="border-b border-surface-200 bg-surface-50/80 text-surface-500 uppercase text-[11px] tracking-wider font-bold">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'px-5 py-3 font-bold',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {rows === null &&
            Array.from({ length: loadingRows }, (_, i) => (
              <tr key={`skeleton-${i}`}>
                {columns.map(col => (
                  <td key={col.key} className="px-5 py-3.5">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          {rows?.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-5 py-16">
                <EmptyState title={emptyTitle} body={emptyBody} action={emptyAction} />
              </td>
            </tr>
          )}
          {rows?.map(row => (
            <tr
              key={rowKey(row)}
              className={cn(
                'transition-colors',
                onRowClick ? 'hover:bg-surface-50/60 cursor-pointer' : 'hover:bg-surface-50/40',
              )}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={cn(
                    'px-5 py-3.5 text-surface-700',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className,
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
