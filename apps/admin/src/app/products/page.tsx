'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

interface AdminProduct {
  id: string;
  name: string;
  status: string;
  basePriceMinorUnits: number;
  currencyCode: string;
  vendor?: { storeName?: string };
  category?: { name?: string };
}

function ProductsInner() {
  const params = useSearchParams();
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [statusFilter, setStatusFilter] = useState(params.get('status') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = statusFilter ? `?status=${statusFilter}` : '';
    api<{ products: AdminProduct[] }>(`/api/v1/admin/products${q}`)
      .then(d => { setProducts(d.products); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, [statusFilter]);

  useEffect(load, [load]);

  async function setStatus(id: string, status: 'ACTIVE' | 'INACTIVE') {
    setBusyId(id);
    try {
      await api(`/api/v1/admin/products/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Products" subtitle="Moderate the catalog" />

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="prod-status" className="text-xs font-semibold text-slate-600">Status:</label>
        <select id="prod-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-slate-300 text-xs px-2 bg-white">
          <option value="">All</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[760px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Product</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Vendor</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Category</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Price</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products === null && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {products?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No products match this filter.</td></tr>
            )}
            {products?.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-semibold text-slate-800 max-w-[280px] truncate">{p.name}</td>
                <td className="px-5 py-3">{p.vendor?.storeName ?? '—'}</td>
                <td className="px-5 py-3 text-slate-500">{p.category?.name ?? '—'}</td>
                <td className="px-5 py-3 tabular-nums font-semibold">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currencyCode }).format(p.basePriceMinorUnits / 100)}
                </td>
                <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {p.status !== 'ACTIVE' && (
                    <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p.id, 'ACTIVE')} className="rounded-md bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1.5 hover:bg-emerald-500 disabled:opacity-50 mr-1.5">Approve</button>
                  )}
                  {p.status !== 'INACTIVE' && (
                    <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p.id, 'INACTIVE')} className="rounded-md border border-red-300 text-red-700 text-[10px] font-bold px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50">Deactivate</button>
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

export default function AdminProductsPage() {
  return (
    <Suspense>
      <ProductsInner />
    </Suspense>
  );
}
