'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

interface AdminDealVariantProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  basePriceMinorUnits: number;
  currencyCode: string;
}

interface AdminDeal {
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
  regionKey?: string | null;
  vendor?: { id: string; storeName?: string; slug?: string } | null;
  region?: { key: string; name: string } | null;
  variants: { id: string; productId: string; product: AdminDealVariantProduct }[];
  _count?: { coupons: number };
}

interface AdminRegion { key: string; name: string; }
interface AdminProduct { id: string; name: string; slug: string; status: string; }

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

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<AdminDeal[] | null>(null);
  const [regions, setRegions] = useState<AdminRegion[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(() => {
    api<{ deals: AdminDeal[] }>('/api/v1/admin/deals')
      .then(d => { setDeals(d.deals); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    api<{ regions: AdminRegion[] }>('/api/v1/admin/regions')
      .then(d => setRegions(d.regions))
      .catch(() => {});
    api<{ products: AdminProduct[] }>('/api/v1/admin/products?status=ACTIVE&limit=100')
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
      await api('/api/v1/admin/deals', {
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

  async function toggleEnabled(deal: AdminDeal) {
    setBusyId(deal.id);
    try {
      await api(`/api/v1/admin/deals/${deal.id}`, { method: 'PUT', body: JSON.stringify({ enabled: !deal.enabled }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function removeDeal(deal: AdminDeal) {
    setBusyId(deal.id);
    try {
      await api(`/api/v1/admin/deals/${deal.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  async function addProduct(deal: AdminDeal, productId: string) {
    if (!productId) return;
    setBusyId(deal.id);
    try {
      await api(`/api/v1/admin/deals/${deal.id}/products`, { method: 'POST', body: JSON.stringify({ productId }) });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Add failed');
    } finally {
      setBusyId(null);
    }
  }

  async function removeProduct(deal: AdminDeal, productId: string) {
    setBusyId(deal.id);
    try {
      await api(`/api/v1/admin/deals/${deal.id}/products/${productId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Remove failed');
    } finally {
      setBusyId(null);
    }
  }

  const valueLabel = (d: AdminDeal) =>
    d.type === 'PERCENTAGE_OFF' ? `${d.value}%` : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(d.value / 100);

  const input = 'rounded-md border border-slate-300 text-xs px-3 py-2 w-full bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand-500/40';

  return (
    <AdminShell>
      <PageHeader title="Deals" subtitle="Create and moderate promotions across regions and vendors" />

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
              {regions.map(r => <option key={r.key} value={r.key}>{r.key} — {r.name}</option>)}
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

      <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Deal</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Value</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Window</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Region</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Products</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Coupons</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deals === null && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {deals?.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No deals yet. Create one to start promoting.</td></tr>
            )}
            {deals?.map(d => (
              <tr key={d.id} className="hover:bg-slate-50 align-top">
                <td className="px-5 py-3">
                  <p className="font-semibold text-slate-800">{d.name}</p>
                  <p className="text-slate-400 text-[10px]">{d.type} · {d.slug}</p>
                  {d.vendor && <p className="text-slate-500 text-[10px]">by {d.vendor.storeName || d.vendor.slug}</p>}
                </td>
                <td className="px-5 py-3 font-semibold tabular-nums">{valueLabel(d)}</td>
                <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                  {new Date(d.startsAt).toLocaleDateString()} → {new Date(d.endsAt).toLocaleDateString()}
                  <p className="text-slate-400 text-[10px]">{d.usedCount} uses</p>
                </td>
                <td className="px-5 py-3">{d.region?.key ?? 'All'}</td>
                <td className="px-5 py-3">
                  <ul className="space-y-1">
                    {d.variants.map(v => (
                      <li key={v.id} className="flex items-center gap-1 text-[10px] text-slate-600">
                        <span className="truncate max-w-[180px]">{v.product.name}</span>
                        <button
                          type="button"
                          disabled={busyId === d.id}
                          onClick={() => removeProduct(d, v.productId)}
                          className="text-red-500 hover:text-red-700 font-bold" title="Remove product"
                        >✕</button>
                      </li>
                    ))}
                  </ul>
                  <select
                    aria-label={`Add product to ${d.name}`}
                    value=""
                    onChange={e => addProduct(d, e.target.value)}
                    className="mt-1 text-[10px] rounded border border-slate-300 bg-surface-raised px-1 py-0.5"
                  >
                    <option value="">+ add product</option>
                    {products.filter(p => !d.variants.some(v => v.productId === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 tabular-nums">{d._count?.coupons ?? 0}</td>
                <td className="px-5 py-3"><StatusBadge status={d.enabled ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
