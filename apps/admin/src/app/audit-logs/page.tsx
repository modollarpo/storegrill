'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';

interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: string | null;
  after?: string | null;
  ip?: string | null;
  createdAt: string;
}

interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ENTITIES = [
  'User', 'Product', 'Order', 'Vendor', 'Region', 'Deal', 'Review', 'Coupon', 'Import', 'Payout', 'Setting',
];

function safeJson(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function Detail({ label, raw }: { label: string; raw: string | null | undefined }) {
  const text = safeJson(raw);
  if (!text) return null;
  return (
    <details className="mt-2 bg-slate-900 rounded-md px-3 py-2">
      <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-brand-400 font-bold select-none">{label}</summary>
      <pre className="mt-2 text-[9px] leading-relaxed text-emerald-300 whitespace-pre-wrap break-words max-h-40 overflow-auto">{text}</pre>
    </details>
  );
}

export default function AdminAuditLogsPage() {
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [pagination, setPagination] = useState<AuditPagination | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (entity) params.set('entity', entity);
    params.set('page', String(page));
    setLogs(null);
    api<{ logs: AuditLog[]; pagination: AuditPagination }>(`/api/v1/admin/audit-logs?${params.toString()}`)
      .then(d => { setLogs(d.logs); setPagination(d.pagination); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, [entity, page]);

  useEffect(load, [load]);

  function selectEntity(v: string) {
    setEntity(v);
    setPage(1);
  }

  return (
    <AdminShell>
      <PageHeader title="Audit Logs" subtitle="Immutable trail of administrative actions across the platform" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label htmlFor="entity-filter" className="text-xs font-semibold text-slate-600">Entity:</label>
        <select id="entity-filter" value={entity} onChange={e => selectEntity(e.target.value)} className="h-8 rounded-md border border-slate-300 text-xs px-2 bg-surface-raised">
          <option value="">All</option>
          {ENTITIES.map(ent => <option key={ent} value={ent}>{ent}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400">{pagination ? `${pagination.total} events` : ''}</span>
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[820px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">When</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Actor</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Action</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Entity</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">IP</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs === null && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {logs?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No audit events match this filter.</td></tr>
            )}
            {logs?.map(l => (
              <tr key={l.id} className="hover:bg-slate-50 align-top">
                <td className="px-5 py-3 whitespace-nowrap text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-5 py-3 font-mono text-slate-500">{l.userId ? l.userId.slice(0, 8) : 'system'}</td>
                <td className="px-5 py-3"><code className="rounded bg-slate-100 text-slate-700 px-1.5 py-0.5 text-[10px] font-bold">{l.action}</code></td>
                <td className="px-5 py-3">
                  <span className="font-semibold text-slate-700">{l.entity}</span>
                  {l.entityId && <span className="text-slate-400 font-mono text-[10px]"> · {l.entityId.slice(0, 8)}</span>}
                </td>
                <td className="px-5 py-3 font-mono text-slate-500">{l.ip ?? '—'}</td>
                <td className="px-5 py-3">
                  {l.before ?? l.after ? (
                    <>
                      <Detail label="Before" raw={l.before} />
                      <Detail label="After" raw={l.after} />
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded-md border border-slate-300 text-slate-600 font-semibold px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            className="rounded-md border border-slate-300 text-slate-600 font-semibold px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </AdminShell>
  );
}
