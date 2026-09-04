'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';

interface Analytics {
  totals: { revenue: number; orders: number };
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  revenueByRegion: Array<{ regionKey: string; revenue: number; orders: number }>;
  salesByVendor: Array<{ vendorId: string; storeName: string; revenue: number; units: number }>;
  salesByCategory: Array<{ categoryId: string; name: string; revenue: number; units: number }>;
  topProducts: Array<{ productId: string; name: string; category: string; revenue: number; units: number }>;
}

function money(minor: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

function currencyFor(regionKey: string): string {
  return ({ UK: 'GBP', US: 'USD', DE: 'EUR', FR: 'EUR', JP: 'JPY' })[regionKey] ?? 'GBP';
}

function AnalyticsInner() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ analytics: Analytics }>('/api/v1/admin/analytics')
      .then(d => { setAnalytics(d.analytics); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <AdminShell>
        <PageHeader title="Analytics" subtitle="Sales performance across regions, vendors and catalog" />
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>
      </AdminShell>
    );
  }

  const data = analytics;
  const maxDay = Math.max(1, ...(data?.revenueByDay.map(d => d.revenue) ?? []));
  const maxRegion = Math.max(1, ...(data?.revenueByRegion.map(r => r.revenue) ?? []));

  return (
    <AdminShell>
      <PageHeader title="Analytics" subtitle="Sales performance across regions, vendors and catalog" />

      {!data && <div className="bg-surface-raised rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400" aria-busy="true">Loading…</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivered revenue</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 [font-variant-numeric:tabular-nums]">{money(data.totals.revenue)}</p>
            </div>
            <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivered orders</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 [font-variant-numeric:tabular-nums]">{data.totals.orders.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Revenue — last 14 days</h2>
            <div className="flex items-end gap-1 h-40" role="img" aria-label="Revenue trend over the last 14 days">
              {data.revenueByDay.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${money(d.revenue)} (${d.orders} orders)`}>
                  <div className="w-full rounded-t bg-indigo-200 group-hover:bg-indigo-400 transition-colors" style={{ height: `${Math.max(3, (d.revenue / maxDay) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-slate-100 pt-2 flex justify-between text-[10px] text-slate-400">
              <span>{new Date(data.revenueByDay[0]?.date ?? Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(data.revenueByDay[data.revenueByDay.length - 1]?.date ?? Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Revenue by region</h2>
              {data.revenueByRegion.length === 0 && <p className="text-xs text-slate-400">No delivered sales yet.</p>}
              <ul className="space-y-3">
                {data.revenueByRegion.map(r => (
                  <li key={r.regionKey}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{r.regionKey} <span className="text-slate-400 font-normal">({r.orders} orders)</span></span>
                      <span className="font-bold text-slate-900 [font-variant-numeric:tabular-nums]">{new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyFor(r.regionKey) }).format(r.revenue / 100)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(r.revenue / maxRegion) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-hidden">
              <h2 className="text-sm font-bold text-slate-900 px-5 pt-5 pb-3 border-b border-slate-100">Top products</h2>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-2 font-semibold">Product</th>
                    <th scope="col" className="px-5 py-2 font-semibold">Category</th>
                    <th scope="col" className="px-5 py-2 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topProducts.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-6 text-center text-slate-400">No delivered sales yet.</td></tr>
                  )}
                  {data.topProducts.map(p => (
                    <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-2.5 font-semibold text-slate-800 max-w-[200px] truncate">{p.name}</td>
                      <td className="px-5 py-2.5 text-slate-500">{p.category}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-slate-900 [font-variant-numeric:tabular-nums]">{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-hidden mb-6">
            <h2 className="text-sm font-bold text-slate-900 px-5 pt-5 pb-3 border-b border-slate-100">Sales by vendor</h2>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Store</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Units</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.salesByVendor.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-slate-400">No delivered sales yet.</td></tr>
                )}
                {data.salesByVendor.map(v => (
                  <tr key={v.vendorId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-2.5 font-semibold text-slate-800">{v.storeName}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600 [font-variant-numeric:tabular-nums]">{v.units.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-slate-900 [font-variant-numeric:tabular-nums]">{money(v.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-hidden">
            <h2 className="text-sm font-bold text-slate-900 px-5 pt-5 pb-3 border-b border-slate-100">Sales by category</h2>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Category</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Units</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.salesByCategory.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-slate-400">No delivered sales yet.</td></tr>
                )}
                {data.salesByCategory.map(c => (
                  <tr key={c.categoryId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-2.5 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600 [font-variant-numeric:tabular-nums]">{c.units.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-slate-900 [font-variant-numeric:tabular-nums]">{money(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}

export default function AdminAnalyticsPage() {
  return <AnalyticsInner />;
}