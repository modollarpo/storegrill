'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatusBadge, Toolbar, Select, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AdminImportJob {
  id: string;
  type: string;
  source: string;
  status: string;
  mode: string;
  phase?: string | null;
  processedRows: number;
  totalRows: number;
  successRows: number;
  errorRows: number;
  vendorName: string;
  scheduleName?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

const STATUS_OPTIONS = ['', 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];

function formatWhen(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function ImportsInner() {
  const [jobs, setJobs] = useState<AdminImportJob[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page) });
    if (statusFilter) q.set('status', statusFilter);
    api<{ jobs: AdminImportJob[]; pagination: { totalPages: number } }>(`/api/v1/admin/imports?${q.toString()}`)
      .then(d => { setJobs(d.jobs); setTotalPages(d.pagination.totalPages); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, [statusFilter, page]);

  useEffect(load, [load]);

  const progress = (j: AdminImportJob) => {
    if (j.totalRows === 0) return 0;
    return Math.round((j.processedRows / j.totalRows) * 100);
  };

  function ProgressBar({ j }: { j: AdminImportJob }) {
    const pct = progress(j);
    const pctClass = j.status === 'FAILED' ? 'bg-red-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-brand-600';
    return (
      <div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-surface-200 overflow-hidden">
            <div className={cn('h-full transition-all', pctClass)} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-surface-500 tabular-nums">{pct}%</span>
        </div>
        {j.phase && <span className="block text-[10px] text-surface-400 mt-0.5">{(j.phase ?? '').replace(/_/g, ' ')}</span>}
      </div>
    );
  }

  const columns: Column<AdminImportJob>[] = [
    { key: 'vendor', header: 'Vendor', render: j => <span className="font-semibold text-surface-800">{j.vendorName}</span> },
    {
      key: 'type',
      header: 'Type',
      render: j => (
        <span className="text-surface-600">
          {j.type.replace(/_/g, ' ')}
          {j.mode && j.mode !== 'APPLY' && <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200/60">{j.mode}</span>}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: j => <StatusBadge status={j.status} /> },
    { key: 'progress', header: 'Progress', render: j => <ProgressBar j={j} /> },
    {
      key: 'rows',
      header: 'Rows',
      align: 'right',
      render: j => (
        <div>
          <span className="font-semibold text-surface-800">{j.successRows}</span> ok <span className="text-surface-400">·</span> <span className={j.errorRows > 0 ? 'text-red-600 font-semibold' : ''}>{j.errorRows}</span> err
          <span className="block text-[10px] text-surface-400 tabular-nums">/ {j.totalRows} total</span>
        </div>
      ),
    },
    { key: 'scheduled', header: 'Scheduled', render: j => <span className="text-surface-600">{j.scheduleName ?? '—'}</span> },
    { key: 'started', header: 'Started', render: j => <span className="text-surface-600">{formatWhen(j.createdAt)}</span> },
    { key: 'finished', header: 'Finished', render: j => <span className="text-surface-600">{formatWhen(j.completedAt)}</span> },
  ];

  return (
    <AdminShell>
      <PageHeader title="Imports" subtitle="Vendor bulk-import jobs across the platform" />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <Toolbar className="mb-4">
        <Select
          id="import-status"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-8 text-xs w-40"
          aria-label="Filter by import status"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === '' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        <span className="text-xs text-surface-400 font-medium tabular-nums">{jobs ? `${jobs.length} shown` : ''}</span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={jobs}
        rowKey={j => j.id}
        minWidth={980}
        emptyTitle="No import jobs found"
        loadingRows={6}
      />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-surface-600">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Prev
          </Button>
          <span className="font-medium tabular-nums">Page {page} / {totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminImportsPage() {
  return <ImportsInner />;
}