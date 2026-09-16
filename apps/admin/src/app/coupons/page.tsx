'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatusBadge, Button, Field, Input, Select, Toolbar } from '@/components/ui';

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

  const columns: Column<AdminCoupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: c => (
        <code className="rounded-md bg-surface-100 px-1.5 py-0.5 font-mono font-bold text-surface-800 text-xs">{c.code}</code>
      ),
    },
    {
      key: 'deal',
      header: 'Deal',
      render: c => (
        <div>
          <span className="font-semibold text-surface-800">{c.deal?.name || c.dealId.slice(0, 8)}</span>
          {c.deal && <span className="text-surface-400 text-[11px]"> · {c.deal.type}</span>}
        </div>
      ),
    },
    { key: 'usage', header: 'Usage', render: c => <span className="tabular-nums">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</span> },
    { key: 'expires', header: 'Expires', render: c => <span className="text-surface-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</span> },
    { key: 'status', header: 'Status', render: c => <StatusBadge status={c.enabled ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: c => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant={c.enabled ? 'dangerOutline' : 'success'} loading={busyId === c.id} onClick={() => toggleEnabled(c)}>
            {c.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" variant="dangerOutline" loading={busyId === c.id} onClick={() => removeCoupon(c)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        title="Coupons"
        subtitle="Discount codes tied to deals. Validity is enforced server-side at checkout"
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ New coupon'}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={createCoupon} className="bg-white border border-surface-200 rounded-xl p-6 mb-6 shadow-xs">
          <h3 className="text-[15px] font-bold text-surface-900 mb-4">New coupon</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Deal" required>
              <Select id="c-deal" required value={form.dealId} onChange={e => set('dealId', e.target.value)}>
                <option value="">Select a deal…</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type}){d.enabled ? '' : ' — disabled'}</option>)}
              </Select>
            </Field>
            <Field label="Code" required>
              <Input id="c-code" required minLength={3} maxLength={50} value={form.code} onChange={e => set('code', e.target.value)} placeholder="GRILL20" className="font-mono uppercase" />
            </Field>
            <Field label="Max uses">
              <Input id="c-maxuses" type="number" min="1" value={form.maxUses} onChange={e => set('maxUses', e.target.value)} />
            </Field>
            <Field label="Expires">
              <Input id="c-expires" type="datetime-local" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-surface-700 sm:col-span-2">
              <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
              Enabled immediately
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="success" loading={submitting}>
                {submitting ? 'Creating…' : 'Create coupon'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <Toolbar className="mb-4">
        <span className="text-xs text-surface-400 font-medium tabular-nums">{coupons ? `${coupons.length} coupons` : ''}</span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={coupons}
        rowKey={c => c.id}
        minWidth={820}
        emptyTitle="No coupons yet"
        emptyBody="Create a deal first, then attach coupon codes."
        loadingRows={6}
      />
    </AdminShell>
  );
}