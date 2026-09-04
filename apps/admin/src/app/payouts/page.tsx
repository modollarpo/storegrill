'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

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

  const shown = payouts?.filter(p => !statusFilter || p.status === statusFilter);

  return (
    <AdminShell>
      <PageHeader title="Payouts" subtitle="Settle vendor earnings from delivered orders" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="p-status" className="text-xs font-semibold text-slate-600">Status:</label>
          <select id="p-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-slate-300 text-xs px-2 bg-surface-raised">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="rounded-md bg-emerald-600 text-white text-xs font-bold px-3 py-2 hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate payouts'}
        </button>
        <span className="ml-auto text-xs text-slate-400">{shown ? `${shown.length} of ${payouts?.length ?? 0} payouts` : ''}</span>
      </div>

      {lastRun && <p role="status" className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{lastRun}</p>}
      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[760px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Vendor</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Period</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Lines</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Amount</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Processed</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown === null && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {shown?.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No payouts match this filter. Use “Generate payouts” to settle delivered orders.</td></tr>
            )}
            {shown?.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 align-top">
                <td className="px-5 py-3">
                  <span className="font-semibold text-slate-800">{p.vendor?.storeName || p.vendorId.slice(0, 8)}</span>
                  <p className="text-slate-400 text-[10px]">{p.vendor?.slug}</p>
                </td>
                <td className="px-5 py-3 font-mono text-slate-600">{p.period}</td>
                <td className="px-5 py-3 tabular-nums">{p.lineCount}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currencyCode }).format(p.amountMinorUnits / 100)}
                </td>
                <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-3 text-slate-500">{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : '—'}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {FLOW[p.status] && (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => advance(p)}
                      className="rounded-md bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1.5 hover:bg-slate-700 transition-colors disabled:opacity-50 mr-1.5"
                    >
                      {busyId === p.id ? '…' : `Mark ${FLOW[p.status]}`}
                    </button>
                  )}
                  {['PENDING', 'PROCESSING'].includes(p.status) && (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => cancel(p)}
                      className="rounded-md border border-red-300 text-red-700 text-[10px] font-bold px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50"
                    >Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}