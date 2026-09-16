'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { StatusBadge, Button, Field, Input, Select, Checkbox } from '@/components/ui';

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
  const [copyBusyId, setCopyBusyId] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<{ dealId: string; headline: string; subheadline: string; hook: string; urgency: string; cta: string } | null>(null);

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

  async function generateCopy(deal: AdminDeal) {
    setCopyBusyId(deal.id);
    setError(null);
    try {
      const r = await api<{ copy: { headline: string; subheadline: string; hook: string; urgency: string; cta: string } }>('/api/v1/creative/deal-copy', {
        method: 'POST',
        body: JSON.stringify({ dealId: deal.id }),
      });
      setCopyResult({ dealId: deal.id, ...r.copy });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Copy generation failed. Check Azure OpenAI configuration.');
    } finally {
      setCopyBusyId(null);
    }
  }

  const valueLabel = (d: AdminDeal) =>
    d.type === 'PERCENTAGE_OFF' ? `${d.value}%` : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(d.value / 100);

  return (
    <AdminShell>
      <PageHeader
        title="Deals"
        subtitle="Create and moderate promotions across regions and vendors"
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ New deal'}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={createDeal} className="bg-white border border-surface-200 rounded-xl shadow-xs p-5 mb-6 grid gap-4 sm:grid-cols-2">
          <Field label="Name" required className="sm:col-span-2">
            <Input id="d-name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Summer Grill Sale" />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input id="d-desc" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Type">
            <Select id="d-type" value={form.type} onChange={e => set('type', e.target.value)}>
              {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Value (minor units)" required>
            <Input id="d-value" required type="number" min="0" step="any" value={form.value} onChange={e => set('value', e.target.value)} />
          </Field>
          <Field label="Min order">
            <Input id="d-min" type="number" min="0" value={form.minOrderAmount} onChange={e => set('minOrderAmount', e.target.value)} />
          </Field>
          <Field label="Max discount">
            <Input id="d-maxdiscount" type="number" min="0" value={form.maxDiscount} onChange={e => set('maxDiscount', e.target.value)} />
          </Field>
          <Field label="Max uses / customer">
            <Input id="d-maxuses" type="number" min="1" value={form.maxUsesPerCustomer} onChange={e => set('maxUsesPerCustomer', e.target.value)} />
          </Field>
          <Field label="Total uses cap">
            <Input id="d-totaluses" type="number" min="1" value={form.totalUses} onChange={e => set('totalUses', e.target.value)} />
          </Field>
          <Field label="Starts">
            <Input id="d-start" type="datetime-local" value={form.startsAt} onChange={e => set('startsAt', e.target.value)} />
          </Field>
          <Field label="Ends">
            <Input id="d-end" type="datetime-local" value={form.endsAt} onChange={e => set('endsAt', e.target.value)} />
          </Field>
          <Field label="Region">
            <Select id="d-region" value={form.regionKey} onChange={e => set('regionKey', e.target.value)}>
              <option value="">All regions</option>
              {regions.map(r => <option key={r.key} value={r.key}>{r.key} — {r.name}</option>)}
            </Select>
          </Field>
          <Field label="Products on deal" className="sm:col-span-2">
            <div className="max-h-32 overflow-auto rounded-lg border border-surface-200 bg-surface-50/60 p-2 space-y-1">
              {products.map(p => (
                <Checkbox key={p.id} checked={form.productIds.includes(p.id)} onChange={() => toggleProduct(p.id)} label={p.name} className="w-full" />
              ))}
              {products.length === 0 && <p className="text-surface-400 text-xs">No active products.</p>}
            </div>
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" variant="success" loading={submitting}>
              {submitting ? 'Creating…' : 'Create deal'}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-surface-200 rounded-xl shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-surface-50 text-surface-500 uppercase text-[10px] tracking-wider">
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
          <tbody className="divide-y divide-surface-100">
            {deals === null && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-surface-400" aria-busy="true">Loading…</td></tr>
            )}
            {deals?.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-surface-400">No deals yet. Create one to start promoting.</td></tr>
            )}
            {deals?.map(d => (
              <tr key={d.id} className="hover:bg-surface-50/60 align-top">
                <td className="px-5 py-3">
                  <p className="font-semibold text-surface-800">{d.name}</p>
                  <p className="text-surface-400 text-[10px]">{d.type} · {d.slug}</p>
                  {d.vendor && <p className="text-surface-500 text-[10px]">by {d.vendor.storeName || d.vendor.slug}</p>}
                </td>
                <td className="px-5 py-3 font-semibold tabular-nums">{valueLabel(d)}</td>
                <td className="px-5 py-3 whitespace-nowrap text-surface-500">
                  {new Date(d.startsAt).toLocaleDateString()} → {new Date(d.endsAt).toLocaleDateString()}
                  <p className="text-surface-400 text-[10px]">{d.usedCount} uses</p>
                </td>
                <td className="px-5 py-3">{d.region?.key ?? 'All'}</td>
                <td className="px-5 py-3">
                  <ul className="space-y-1">
                    {d.variants.map(v => (
                      <li key={v.id} className="flex items-center gap-1 text-[10px] text-surface-600">
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
                    className="mt-1 text-[10px] rounded border border-surface-300 bg-white px-1 py-0.5"
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
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={copyBusyId === d.id}
                    disabled={busyId === d.id}
                    onClick={() => generateCopy(d)}
                    className="mr-1.5"
                  >
                    {copyBusyId === d.id ? 'Generating…' : 'AI copy'}
                  </Button>
                  <Button
                    size="sm"
                    variant={d.enabled ? 'dangerOutline' : 'success'}
                    loading={busyId === d.id}
                    disabled={copyBusyId === d.id}
                    onClick={() => toggleEnabled(d)}
                    className="mr-1.5"
                  >
                    {d.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="dangerOutline" disabled={copyBusyId === d.id} loading={busyId === d.id} onClick={() => removeDeal(d)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {copyResult && (
        <div className="mt-4 bg-white border border-surface-200 rounded-xl shadow-xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-surface-800">AI Deal Copy</h3>
            <Button size="sm" variant="ghost" onClick={() => setCopyResult(null)}>Close</Button>
          </div>
          <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/60">
              <dt className="font-semibold text-surface-500 mb-1">Headline</dt>
              <dd className="font-bold text-surface-800">{copyResult.headline}</dd>
            </div>
            <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/60">
              <dt className="font-semibold text-surface-500 mb-1">Subheadline</dt>
              <dd className="text-surface-700">{copyResult.subheadline}</dd>
            </div>
            <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/60">
              <dt className="font-semibold text-surface-500 mb-1">Hook</dt>
              <dd className="text-surface-700">{copyResult.hook}</dd>
            </div>
            <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/60">
              <dt className="font-semibold text-surface-500 mb-1">Urgency</dt>
              <dd className="text-surface-700">{copyResult.urgency}</dd>
            </div>
            <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/60">
              <dt className="font-semibold text-surface-500 mb-1">CTA</dt>
              <dd className="font-bold text-brand-700">{copyResult.cta}</dd>
            </div>
          </dl>
          <div className="mt-3 flex gap-2 flex-wrap">
            {([['headline', copyResult.headline], ['subheadline', copyResult.subheadline], ['hook', copyResult.hook], ['urgency', copyResult.urgency], ['CTA', copyResult.cta]] as const).map(([label, value]) => (
              <Button
                key={label}
                size="sm"
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(value).catch(() => {})}
              >
                Copy {label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}