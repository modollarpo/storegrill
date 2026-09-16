'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatusBadge, Button, Toolbar, Select } from '@/components/ui';

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  currencyCode: string;
  totalMinorUnits: number;
  user?: { name?: string; email?: string };
  items?: Array<{ quantity?: number }>;
}

const STATUSES = ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = statusFilter ? `?status=${statusFilter}` : '';
    api<{ orders: AdminOrder[] }>(`/api/v1/admin/orders${q}`)
      .then(d => { setOrders(d.orders); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, [statusFilter]);

  useEffect(load, [load]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await api(`/api/v1/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<AdminOrder>[] = [
    {
      key: 'order',
      header: 'Order',
      render: o => (
        <span className="font-mono font-semibold text-surface-900">#{o.orderNumber}</span>
      ),
    },
    { key: 'customer', header: 'Customer', render: o => o.user?.name || o.user?.email || '—' },
    { key: 'placed', header: 'Placed', render: o => <span className="text-surface-500">{new Date(o.createdAt).toLocaleDateString()}</span> },
    { key: 'status', header: 'Status', render: o => <StatusBadge status={o.status} /> },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      render: o => (
        <span className="font-bold text-surface-900 tabular-nums">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: o.currencyCode }).format(o.totalMinorUnits / 100)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Advance to',
      align: 'right',
      render: o => {
        const next = STATUSES[Math.min(STATUSES.indexOf(o.status) + 1, 4)];
        if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status)) return null;
        return (
          <Button
            size="sm"
            variant="secondary"
            loading={busyId === o.id}
            onClick={() => updateStatus(o.id, next)}
          >
            → {next}
          </Button>
        );
      },
    },
  ];

  return (
    <AdminShell>
      <PageHeader title="Orders" subtitle="Monitor and advance the order lifecycle" />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <Toolbar className="mb-4">
        <Select
          id="status-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <span className="text-xs text-surface-400 font-medium tabular-nums">
          {orders ? `${orders.length} shown` : ''}
        </span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={orders}
        rowKey={o => o.id}
        minWidth={760}
        emptyTitle="No orders match this filter"
        loadingRows={6}
      />
    </AdminShell>
  );
}