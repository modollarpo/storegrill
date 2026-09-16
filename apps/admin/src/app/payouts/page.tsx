'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatusBadge, Button, Toolbar, Select } from '@/components/ui';

interface AdminPayout {
  id: string;
  vendorId: string;
  amountMinorUnits: number;
  currencyCode: string;
  status: string;
  period: string;
  processedAt?: string | null;
  createdAt: string;
  lineCount: number;
  vendor?: { id: string; storeName?: string; slug?: string };
}

const FLOW: Record<string, string> = {
  PENDING: 'PROCESSING',
  PROCESSING: 'PAID',
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayout[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ payouts: AdminPayout[] }>('/api/v1/admin/payouts')
      .then(d => { setPayouts(d.payouts); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const d = await api<{ created: number }>('/api/v1/admin/payouts/generate', { method: 'POST' });
      setLastRun(`${d.created} payout${d.created === 1 ? '' : 's'} generated for settled orders`);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Generate failed');
    } finally {
      setGenerating(false);
    }
  }

  async function advance(p: AdminPayout) {
    const next = FLOW[p.status];
    if (!next) return;
    setBusyId(p.id);
    try {
      await api(`/api/v1/admin/payouts/${p.id}/status`, { method: 'PUT', body: JSON.stringify({ status: next }) });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(p: AdminPayout) {
    setBusyId(p.id);
    try {
      await api(`/api/v1/admin/payouts/${p.id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'CANCELLED' }) });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  const shown = payouts ? payouts.filter(p => !statusFilter || p.status === statusFilter) : null;

  const columns: Column<AdminPayout>[] = [
    {
      key: 'vendor',
      header: 'Vendor',
      render: p => (
        <div>
          <span className="font-semibold text-surface-800">{p.vendor?.storeName || p.vendorId.slice(0, 8)}</span>
          <p className="text-[11px] text-surface-400">{p.vendor?.slug}</p>
        </div>
      ),
    },
    { key: 'period', header: 'Period', render: p => <span className="font-mono text-surface-600 text-xs">{p.period}</span> },
    { key: 'lines', header: 'Lines', render: p => <span className="tabular-nums">{p.lineCount}</span> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: p => (
        <span className="font-bold text-surface-900 tabular-nums">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currencyCode }).format(p.amountMinorUnits / 100)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: p => <StatusBadge status={p.status} /> },
    { key: 'processed', header: 'Processed', render: p => <span className="text-surface-500">{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : '—'}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: p => (
        <div className="flex justify-end gap-1.5">
          {FLOW[p.status] && (
            <Button size="sm" variant="primary" loading={busyId === p.id} onClick={() => advance(p)}>
              {busyId === p.id ? '…' : `Mark ${FLOW[p.status]}`}
            </Button>
          )}
          {['PENDING', 'PROCESSING'].includes(p.status) && (
            <Button size="sm" variant="dangerOutline" loading={busyId === p.id} onClick={() => cancel(p)}>
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader title="Payouts" subtitle="Settle vendor earnings from delivered orders" />

      <Toolbar className="mb-4">
        <Select
          id="p-status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs w-40"
          aria-label="Filter by payout status"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <Button size="sm" variant="success" loading={generating} onClick={generate}>
          {generating ? 'Generating…' : 'Generate payouts'}
        </Button>
        <span className="text-xs text-surface-400 font-medium tabular-nums">
          {shown ? `${shown.length} of ${payouts?.length ?? 0} payouts` : ''}
        </span>
      </Toolbar>

      {lastRun && (
        <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {lastRun}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={shown}
        rowKey={p => p.id}
        minWidth={860}
        emptyTitle="No payouts match this filter"
        emptyBody="Use “Generate payouts” to settle delivered orders."
        loadingRows={6}
      />
    </AdminShell>
  );
}