'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

interface AdminCoupon {
  id: string;
  dealId: string;
  code: string;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  enabled: boolean;
  createdAt: string;
  deal?: { id: string; name: string; type: string };
}

interface AdminDealOption { id: string; name: string; type: string; enabled: boolean; }

const EMPTY_FORM = {
  dealId: '',
  code: '',
  maxUses: '',
  expiresAt: '',
  enabled: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [deals, setDeals] = useState<AdminDealOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(() => {
    api<{ coupons: AdminCoupon[] }>('/api/v1/admin/coupons')
      .then(d => { setCoupons(d.coupons); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    api<{ deals: AdminDealOption[] }>('/api/v1/admin/deals')
      .then(d => setDeals(d.deals))
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api('/api/v1/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          dealId: form.dealId,
          code: form.code.trim().toUpperCase(),
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          enabled: form.enabled,
        }),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(c: AdminCoupon) {
    setBusyId(c.id);
    try {
      await api(`/api/v1/admin/coupons/${c.id}`, { method: 'PUT', body: JSON.stringify({ enabled: !c.enabled }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function removeCoupon(c: AdminCoupon) {
    setBusyId(c.id);
    try {
      await api(`/api/v1/admin/coupons/${c.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const input = 'rounded-md border border-slate-300 text-xs px-3 py-2 w-full bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand-500/40';

  return (
    <AdminShell>
      <PageHeader title="Coupons" subtitle="Discount codes tied to deals. Validity is enforced server-side at checkout" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">{coupons ? `${coupons.length} coupons` : ''}</span>
        <button type="button" onClick={() => setShowForm(s => !s)} className="rounded-md bg-slate-900 text-white text-xs font-bold px-3 py-2 hover:bg-slate-700 transition-colors">
          {showForm ? 'Cancel' : '+ New coupon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createCoupon} className="bg-surface-raised rounded-xl border border-slate-200 p-5 mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="c-deal" className="block text-xs font-semibold text-slate-600 mb-1">Deal</label>
            <select id="c-deal" required value={form.dealId} onChange={e => set('dealId', e.target.value)} className={input}>
              <option value="">Select a deal…</option>
              {deals.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type}){d.enabled ? '' : ' — disabled'}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="c-code" className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
            <input id="c-code" required minLength={3} maxLength={50} value={form.code} onChange={e => set('code', e.target.value)} placeholder="GRILL20" className={input} />
          </div>
          <div>
            <label htmlFor="c-maxuses" className="block text-xs font-semibold text-slate-600 mb-1">Max uses</label>
            <input id="c-maxuses" type="number" min="1" value={form.maxUses} onChange={e => set('maxUses', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="c-expires" className="block text-xs font-semibold text-slate-600 mb-1">Expires</label>
            <input id="c-expires" type="datetime-local" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} className={input} />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:col-span-2">
            <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="h-4 w-4" />
            Enabled immediately
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting} className="rounded-md bg-emerald-600 text-white text-xs font-bold px-4 py-2 hover:bg-emerald-500 transition-colors disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create coupon'}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Code</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Deal</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Usage</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Expires</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coupons === null && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {coupons?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No coupons yet. Create a deal first, then attach coupon codes.</td></tr>
            )}
            {coupons?.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 align-top">
                <td className="px-5 py-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-800">{c.code}</code></td>
                <td className="px-5 py-3">
                  <span className="font-semibold text-slate-700">{c.deal?.name || c.dealId.slice(0, 8)}</span>
                  {c.deal && <span className="text-slate-400 text-[10px]"> · {c.deal.type}</span>}
                </td>
                <td className="px-5 py-3 tabular-nums">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td className="px-5 py-3 text-slate-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
                <td className="px-5 py-3"><StatusBadge status={c.enabled ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => toggleEnabled(c)}
                    className={
                      (c.enabled ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500') +
                      ' text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50 mr-1.5'
                    }
                  >
                    {c.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => removeCoupon(c)}
                    className="rounded-md border border-red-300 text-red-700 text-[10px] font-bold px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50"
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}