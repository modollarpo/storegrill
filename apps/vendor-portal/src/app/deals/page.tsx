'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

interface DealVariant {
  id: string;
  productId: string;
  product: { id: string; name: string; slug: string; thumbnail?: string | null };
}

interface VendorDeal {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  type: string;
  value: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  maxUsesPerCustomer?: number | null;
  totalUses?: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
  status: string;
  regionKey?: string | null;
  merchantDealPriceMinorUnits?: number | null;
  rrpMinorUnits?: number | null;
  variants: DealVariant[];
  _count?: { coupons: number };
}

interface VendorProduct {
  id: string;
  name: string;
  slug: string;
  basePriceMinorUnits: number;
  currencyCode: string;
}

const DEAL_TYPES = ['PERCENTAGE_OFF', 'FIXED_AMOUNT', 'BOGO', 'BUNDLE', 'FLASH_SALE'] as const;

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'PERCENTAGE_OFF',
  value: '',
  minOrderAmount: '',
  maxDiscount: '',
  maxUsesPerCustomer: '',
  totalUses: '',
  startsAt: '',
  endsAt: '',
  regionKey: '',
  productIds: [] as string[],
};

export default function VendorDealsPage() {
  const [deals, setDeals] = useState<VendorDeal[] | null>(null);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(() => {
    api<{ deals: VendorDeal[] }>('/api/v1/vendors/me/deals')
      .then(d => { setDeals(d.deals); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    api<{ products: VendorProduct[] }>('/api/v1/vendors/me/products?status=ACTIVE&limit=100')
      .then(d => setProducts(d.products))
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function toggleProduct(id: string) {
    setForm(f => ({
      ...f,
      productIds: f.productIds.includes(id) ? f.productIds.filter(x => x !== id) : [...f.productIds, id],
    }));
  }

  async function createDeal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api('/api/v1/vendors/me/deals', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          value: Number(form.value),
          minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
          maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
          maxUsesPerCustomer: form.maxUsesPerCustomer ? Number(form.maxUsesPerCustomer) : undefined,
          totalUses: form.totalUses ? Number(form.totalUses) : undefined,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
          regionKey: form.regionKey || undefined,
          productIds: form.productIds,
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

  async function toggleEnabled(deal: VendorDeal) {
    setBusyId(deal.id);
    try {
      await api(`/api/v1/vendors/me/deals/${deal.id}`, { method: 'PUT', body: JSON.stringify({ enabled: !deal.enabled }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function removeDeal(deal: VendorDeal) {
    setBusyId(deal.id);
    try {
      await api(`/api/v1/vendors/me/deals/${deal.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const valueLabel = (d: VendorDeal) =>
    d.type === 'PERCENTAGE_OFF' ? `${d.value}%` : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(d.value / 100);

  const input = 'rounded-md border border-slate-300 text-xs px-3 py-2 w-full bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand-500/40';

  const columns: Array<DataTableColumn<VendorDeal>> = [
    {
      key: 'name',
      label: 'Deal',
      sortable: true,
      sortValue: d => d.name,
      render: d => (
        <div>
          <p className="font-semibold text-slate-800">{d.name}</p>
          <p className="text-slate-400 text-[10px]">{d.type} · {d.slug}</p>
        </div>
      ),
    },
    { key: 'value', label: 'Value', sortable: true, sortValue: d => d.value, render: d => <span className="font-semibold tabular-nums">{valueLabel(d)}</span> },
    {
      key: 'window',
      label: 'Window',
      render: d => (
        <span className="whitespace-nowrap text-slate-500">
          {new Date(d.startsAt).toLocaleDateString()} → {new Date(d.endsAt).toLocaleDateString()}
          <p className="text-slate-400 text-[10px]">{d.usedCount} uses</p>
        </span>
      ),
    },
    { key: 'products', label: 'Products', render: d => <span className="tabular-nums">{d.variants.length}</span> },
    { key: 'coupons', label: 'Coupons', render: d => <span className="tabular-nums">{d._count?.coupons ?? 0}</span> },
    { key: 'status', label: 'Status', render: d => <StatusBadge status={d.enabled ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: d => (
        <span className="whitespace-nowrap">
          <button
            type="button"
            disabled={busyId === d.id}
            onClick={() => toggleEnabled(d)}
            className={
              (d.enabled ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500') +
              ' text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50 mr-1.5'
            }
          >
            {d.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            disabled={busyId === d.id}
            onClick={() => removeDeal(d)}
            className="rounded-md border border-red-300 text-red-700 text-[10px] font-bold px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50"
          >Delete</button>
        </span>
      ),
    },
  ];

  return (
    <VendorShell>
      <PageHeader title="Deal Studio" subtitle="Create and manage promotions for your products" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">{deals ? `${deals.length} deals` : ''}</span>
        <button type="button" onClick={() => setShowForm(s => !s)} className="rounded-md bg-slate-900 text-white text-xs font-bold px-3 py-2 hover:bg-slate-700 transition-colors">
          {showForm ? 'Cancel' : '+ New deal'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createDeal} className="bg-surface-raised rounded-xl border border-slate-200 p-5 mb-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="d-name" className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
            <input id="d-name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Summer Grill Sale" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="d-desc" className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <input id="d-desc" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" className={input} />
          </div>
          <div>
            <label htmlFor="d-type" className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
            <select id="d-type" value={form.type} onChange={e => set('type', e.target.value)} className={input}>
              {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="d-value" className="block text-xs font-semibold text-slate-600 mb-1">Value <span className="text-slate-400">(minor units)</span></label>
            <input id="d-value" required type="number" min="0" step="any" value={form.value} onChange={e => set('value', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="d-min" className="block text-xs font-semibold text-slate-600 mb-1">Min order</label>
            <input id="d-min" type="number" min="0" value={form.minOrderAmount} onChange={e => set('minOrderAmount', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="d-maxdiscount" className="block text-xs font-semibold text-slate-600 mb-1">Max discount</label>
            <input id="d-maxdiscount" type="number" min="0" value={form.maxDiscount} onChange={e => set('maxDiscount', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="d-maxuses" className="block text-xs font-semibold text-slate-600 mb-1">Max uses / customer</label>
            <input id="d-maxuses" type="number" min="1" value={form.maxUsesPerCustomer} onChange={e => set('maxUsesPerCustomer', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="d-totaluses" className="block text-xs font-semibold text-slate-600 mb-1">Total uses cap</label>
            <input id="d-totaluses" type="number" min="1" value={form.totalUses} onChange={e => set('totalUses', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="d-start" className="block text-xs font-semibold text-slate-600 mb-1">Starts</label>
            <input id="d-start" type="datetime-local" value={form.startsAt} onChange={e => set('startsAt', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="d-end" className="block text-xs font-semibold text-slate-600 mb-1">Ends</label>
            <input id="d-end" type="datetime-local" value={form.endsAt} onChange={e => set('endsAt', e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="d-region" className="block text-xs font-semibold text-slate-600 mb-1">Region</label>
            <select id="d-region" value={form.regionKey} onChange={e => set('regionKey', e.target.value)} className={input}>
              <option value="">All regions</option>
              <option value="UK">UK</option>
              <option value="US">US</option>
              <option value="EU">EU</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Products on deal</label>
            <div className="max-h-32 overflow-auto rounded-md border border-slate-200 bg-surface-raised p-2 space-y-1">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                  <span className="truncate">{p.name}</span>
                </label>
              ))}
              {products.length === 0 && <p className="text-slate-400 text-xs">No active products.</p>}
            </div>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting} className="rounded-md bg-emerald-600 text-white text-xs font-bold px-4 py-2 hover:bg-emerald-500 transition-colors disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create deal'}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <DataTable
        columns={columns}
        rows={deals ?? []}
        loading={deals === null}
        rowKey={d => d.id}
        emptyTitle="No deals yet"
        emptyAction={
          <p className="text-xs text-slate-400">Create a deal to start promoting your products.</p>
        }
        caption="Your deals"
      />
    </VendorShell>
  );
}
