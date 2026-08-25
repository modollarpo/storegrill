'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  currencyCode: string;
  totalMinorUnits: number;
  user?: { name?: string; email?: string };
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

  return (
    <AdminShell>
      <PageHeader title="Orders" subtitle="Monitor and advance the order lifecycle" />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="status-filter" className="text-xs font-semibold text-slate-600">Status:</label>
        <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-slate-300 text-xs px-2 bg-white">
          <option value="">All</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="ml-auto text-xs text-slate-400">{orders ? `${orders.length} shown` : ''}</span>
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Order</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Customer</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Placed</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Total</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Advance to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders === null && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {orders?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No orders match this filter.</td></tr>
            )}
            {orders?.map(o => {
              const next = STATUSES[Math.min(STATUSES.indexOf(o.status) + 1, 4)];
              return (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-mono font-semibold text-slate-700">#{o.orderNumber}</td>
                  <td className="px-5 py-3">{o.user?.name || o.user?.email || '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: o.currencyCode }).format(o.totalMinorUnits / 100)}
                  </td>
                  <td className="px-5 py-3">
                    {!['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status) && (
                      <button
                        type="button"
                        disabled={busyId === o.id}
                        onClick={() => updateStatus(o.id, next)}
                        className="rounded-md bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        {busyId === o.id ? '…' : `→ ${next}`}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
