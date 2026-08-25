'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
  pageSize?: number;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  caption?: string;
}

const PAGE_SIZES = [10, 25, 50];

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  emptyTitle = 'Nothing here yet',
  emptyAction,
  pageSize: fixedPageSize,
  initialSort,
  caption,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState(initialSort?.key ?? null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSort?.dir ?? 'asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(fixedPageSize ?? 25);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const getter = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const allOnPageSelected = selectable && selectedKeys !== undefined && pageRows.length > 0 &&
    pageRows.every(r => selectedKeys.has(rowKey(r)));

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortable || !col.sortValue) return;
    if (sortKey === col.key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  }

  function toggleAll() {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (allOnPageSelected) pageRows.forEach(r => next.delete(rowKey(r)));
    else pageRows.forEach(r => next.add(rowKey(r)));
    onSelectionChange(next);
  }

  function toggleRow(key: string) {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" aria-busy="true">
        <div className="h-10 bg-slate-50 border-b border-slate-200" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 border-b border-slate-100 last:border-0 animate-pulse bg-slate-50/50" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center" data-testid="datatable-empty">
        <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
        {emptyAction && <div className="mt-3">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" data-testid="datatable">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs [font-variant-numeric:tabular-nums]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              {selectable && (
                <th scope="col" className="pl-4 pr-2 py-2.5 w-9">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('px-4 py-2.5 font-semibold whitespace-nowrap', col.align === 'right' && 'text-right')}
                >
                  {col.sortable && col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col)}
                      className={cn(
                        'inline-flex items-center gap-1 hover:text-slate-800 transition-colors',
                        sortKey === col.key && 'text-indigo-600',
                        col.align === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {col.label}
                      <svg className={cn('w-2.5 h-2.5 transition-transform', sortKey === col.key && sortDir === 'desc' && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map(row => {
              const key = rowKey(row);
              const isSelected = selectable && selectedKeys?.has(key);
              return (
                <tr key={key} className={cn('hover:bg-slate-50/70 transition-colors', isSelected && 'bg-indigo-50/60')}>
                  {selectable && (
                    <td className="pl-4 pr-2 py-3 w-9">
                      <input
                        type="checkbox"
                        aria-label={`Select row ${key}`}
                        checked={isSelected ?? false}
                        onChange={() => toggleRow(key)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-slate-700', col.align === 'right' && 'text-right')}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-200 bg-slate-50/60 text-[11px] text-slate-500">
        <span data-testid="datatable-count">
          {sorted.length === 0 ? '0' : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length}`}
        </span>
        {!fixedPageSize && (
          <label className="flex items-center gap-1.5">
            Rows:
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-7 rounded border border-slate-300 bg-white px-1.5 text-[11px]"
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} label="Previous page">‹ Prev</PageBtn>
          <span className="px-2 font-medium text-slate-600">{safePage} / {totalPages}</span>
          <PageBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} label="Next page">Next ›</PageBtn>
        </div>
      </div>
    </div>
  );
}

function PageBtn({ disabled, onClick, label, children }: { disabled: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="rounded border border-slate-300 bg-white px-2 py-1 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-500"
    >
      {children}
    </button>
  );
}
