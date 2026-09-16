'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, Toolbar, Button, Select } from '@/components/ui';

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
    <details className="mt-1.5 bg-surface-950 rounded-md px-3 py-2">
      <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-brand-400 font-bold select-none">{label}</summary>
      <pre className="mt-2 text-[9px] leading-relaxed text-emerald-400 whitespace-pre-wrap break-words max-h-40 overflow-auto">{text}</pre>
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
    api<{ logs: AuditLog[]; pagination: AuditPagination }>(`/api/v1/admin/audit-logs?${params.toString()}`)
      .then(d => { setLogs(d.logs); setPagination(d.pagination); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, [entity, page]);

  useEffect(() => { load(); }, [load]);

  function selectEntity(v: string) {
    setEntity(v);
    setPage(1);
  }

  const columns: Column<AuditLog>[] = [
    { key: 'when', header: 'When', render: l => <span className="text-surface-500 whitespace-nowrap text-xs">{new Date(l.createdAt).toLocaleString()}</span> },
    { key: 'actor', header: 'Actor', render: l => <span className="font-mono text-surface-500">{l.userId ? l.userId.slice(0, 8) : 'system'}</span> },
    { key: 'action', header: 'Action', render: l => <code className="rounded-md bg-surface-100 text-surface-700 px-1.5 py-0.5 text-[10px] font-bold">{l.action}</code> },
    {
      key: 'entity',
      header: 'Entity',
      render: l => (
        <span className="text-surface-700 font-semibold text-xs">
          {l.entity}
          {l.entityId && <span className="text-surface-400 font-mono text-[10px]"> · {l.entityId.slice(0, 8)}</span>}
        </span>
      ),
    },
    { key: 'ip', header: 'IP', render: l => <span className="font-mono text-surface-500 text-xs">{l.ip ?? '—'}</span> },
    {
      key: 'changes',
      header: 'Changes',
      render: l =>
        l.before ?? l.after ? (
          <>
            <Detail label="Before" raw={l.before} />
            <Detail label="After" raw={l.after} />
          </>
        ) : (
          <span className="text-surface-400">—</span>
        ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader title="Audit Logs" subtitle="Immutable trail of administrative actions across the platform" />

      <Toolbar className="mb-4">
        <Select
          id="entity-filter"
          value={entity}
          onChange={e => selectEntity(e.target.value)}
          className="h-8 text-xs w-44"
          aria-label="Filter by entity"
        >
          <option value="">All entities</option>
          {ENTITIES.map(ent => <option key={ent} value={ent}>{ent}</option>)}
        </Select>
        <span className="text-xs text-surface-400 font-medium tabular-nums">
          {pagination ? `${pagination.total} events` : ''}
        </span>
      </Toolbar>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={logs}
        rowKey={l => l.id}
        minWidth={860}
        emptyTitle="No audit events match this filter"
        loadingRows={6}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-surface-600">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            ← Prev
          </Button>
          <span className="font-medium tabular-nums">{pagination.page} of {pagination.totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}>
            Next →
          </Button>
        </div>
      )}
    </AdminShell>
  );
}