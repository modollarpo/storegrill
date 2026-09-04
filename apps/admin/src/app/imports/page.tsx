'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

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

  return (
    <AdminShell>
      <PageHeader title="Imports" subtitle="Vendor bulk-import jobs across the platform" />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="import-status" className="text-xs font-semibold text-slate-600">Status:</label>
        <select id="import-status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="h-8 rounded-md border border-slate-300 text-xs px-2 bg-surface-raised">
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === '' ? 'All' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Vendor</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Type</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Progress</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Rows</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Scheduled</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Started</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Finished</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs === null && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {jobs?.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No import jobs found.</td></tr>
            )}
            {jobs?.map(j => {
              const pct = progress(j);
              const pctColor = j.status === 'FAILED' ? 'bg-red-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500';
              return (
                <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-800">{j.vendorName}</td>
                  <td className="px-5 py-3 text-slate-600">{j.type.replace(/_/g, ' ')}{j.mode && j.mode !== 'APPLY' && <span className="ml-1.5 text-amber-600 font-semibold">{j.mode}</span>}</td>
                  <td className="px-5 py-3"><StatusBadge status={j.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full ${pctColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    {j.phase && <span className="block text-[10px] text-slate-400 mt-0.5">{j.phase.replace(/_/g, ' ')}</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    <span className="font-semibold text-slate-800">{j.successRows}</span> ok · {j.errorRows} err
                    <span className="block text-[10px] text-slate-400">/ {j.totalRows} total</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{j.scheduleName ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{formatWhen(j.createdAt)}</td>
                  <td className="px-5 py-3 text-slate-600">{formatWhen(j.completedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
          <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded border border-slate-300 px-3 py-1.5 font-medium hover:border-indigo-400 disabled:opacity-40">
            Prev
          </button>
          <span>Page {page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded border border-slate-300 px-3 py-1.5 font-medium hover:border-indigo-400 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminImportsPage() {
  return <ImportsInner />;
}