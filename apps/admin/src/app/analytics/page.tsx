'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { Card, CardHeader, CardTitle, CardDescription, StatCard } from '@/components/ui';

interface Analytics {
  totals: { revenue: number; orders: number };
  funnel: Array<{ stage: string; count: number; pct: number }>;
  importStats: { jobsByStatus: Record<string, number>; successRows: number; errorRows: number };
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  revenueByRegion: Array<{ regionKey: string; currencyCode: string; revenue: number; orders: number }>;
  salesByVendor: Array<{ vendorId: string; storeName: string; revenue: number; units: number }>;
  salesByCategory: Array<{ categoryId: string; name: string; revenue: number; units: number }>;
  topProducts: Array<{ productId: string; name: string; category: string; revenue: number; units: number }>;
}

interface EventVolumes {
  totals: { count: number; totalValue: number };
  byEventType: Array<{ eventType: string; count: number }>;
  byDay: Array<{ date: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
}

function money(minor: number, currencyCode = 'GBP'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(minor / 100);
}

function AnalyticsInner() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [events, setEvents] = useState<EventVolumes | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ analytics: Analytics }>('/api/v1/admin/analytics')
      .then(d => { setAnalytics(d.analytics); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
    api<{ events: EventVolumes }>('/api/v1/admin/analytics/events?days=14')
      .then(d => setEvents(d.events))
      .catch(() => setEvents(null));
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <AdminShell>
        <PageHeader title="Analytics" subtitle="Sales performance across regions, vendors and catalog" />
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">{error}</div>
      </AdminShell>
    );
  }

  const data = analytics;
  const maxDay = Math.max(1, ...(data?.revenueByDay.map(d => d.revenue) ?? []));
  const maxRegion = Math.max(1, ...(data?.revenueByRegion.map(r => r.revenue) ?? []));

  return (
    <AdminShell>
      <PageHeader title="Analytics" subtitle="Sales performance across regions, vendors and catalog" />

      {!data && (
        <div className="bg-white border border-surface-200 rounded-xl shadow-xs p-10 text-center text-sm text-surface-400" aria-busy="true">
          Loading…
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard label="Delivered revenue" value={money(data.totals.revenue)} />
            <StatCard label="Delivered orders" value={data.totals.orders.toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion funnel</CardTitle>
              </CardHeader>
              <ol className="space-y-3">
                {data.funnel.map((s, i) => (
                  <li key={s.stage} className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-surface-700">{s.stage}</span>
                        <span className="text-surface-500 tabular-nums">{s.count.toLocaleString()} <span className="text-surface-400">({s.pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Import jobs</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-2 gap-3">
                {(['COMPLETED', 'RUNNING', 'PENDING', 'FAILED'] as const).map(status => (
                  <div key={status} className="rounded-lg border border-surface-100 bg-surface-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">{status}</p>
                    <p className="text-xl font-extrabold text-surface-900 mt-1 tabular-nums">{data.importStats.jobsByStatus[status] ?? 0}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-surface-500">Rows imported</span>
                <span className="font-bold text-emerald-600 tabular-nums">{data.importStats.successRows.toLocaleString()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-surface-500">Rows failed</span>
                <span className="font-bold text-rose-600 tabular-nums">{data.importStats.errorRows.toLocaleString()}</span>
              </div>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Revenue — last 14 days</CardTitle>
            </CardHeader>
            <div className="flex items-end gap-1 h-40" role="img" aria-label="Revenue trend over the last 14 days">
              {data.revenueByDay.map(d => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${money(d.revenue)} (${d.orders} orders)`}>
                  <div className="w-full rounded-t bg-brand-200 group-hover:bg-brand-400 transition-colors" style={{ height: `${Math.max(3, (d.revenue / maxDay) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-surface-100 pt-2 flex justify-between text-[10px] text-surface-400">
              <span>{new Date(data.revenueByDay[0]?.date ?? Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(data.revenueByDay[data.revenueByDay.length - 1]?.date ?? Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
            </div>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>First-party event stream — last 14 days</CardTitle>
              <CardDescription>Counts captured from the storefront API (same events as GA4). Use to sanity-check GA4 reports (page_view, view_item, add_to_cart, begin_checkout, purchase).</CardDescription>
            </CardHeader>
            {!events && <p className="text-xs text-surface-400">No events recorded yet in this window.</p>}
            {events && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-lg border border-surface-100 bg-surface-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Events</p>
                    <p className="text-xl font-extrabold text-surface-900 mt-1 tabular-nums">{events.totals.count.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-surface-100 bg-surface-50/70 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Event value</p>
                    <p className="text-xl font-extrabold text-surface-900 mt-1 tabular-nums">{money(events.totals.totalValue)}</p>
                  </div>
                </div>

                <div className="flex items-end gap-1 h-24 mb-4" role="img" aria-label="Event volume per day over the last 14 days">
                  {(() => {
                    const maxEventDay = Math.max(1, ...events.byDay.map(d => d.count));
                    return events.byDay.map(d => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${d.count.toLocaleString()} events`}>
                        <div className="w-full rounded-t bg-amber-200 group-hover:bg-amber-400 transition-colors" style={{ height: `${Math.max(3, (d.count / maxEventDay) * 100)}%` }} />
                      </div>
                    ));
                  })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-bold text-surface-700 mb-2">By event type</h3>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-50 text-surface-500 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-semibold">Event</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {events.byEventType.map(e => (
                          <tr key={e.eventType} className="hover:bg-surface-50/70 transition-colors">
                            <td className="px-3 py-2 font-semibold text-surface-800">{e.eventType}</td>
                            <td className="px-3 py-2 text-right font-bold text-surface-900 tabular-nums">{e.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-surface-700 mb-2">By region</h3>
                    {(() => {
                      const maxRegionEvents = Math.max(1, ...events.byRegion.map(r => r.count));
                      return (
                        <ul className="space-y-3 pt-1">
                          {events.byRegion.map(r => (
                            <li key={r.region}>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-surface-700">{r.region}</span>
                                <span className="text-surface-500 tabular-nums">{r.count.toLocaleString()}</span>
                              </div>
                              <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                                <div className="h-full rounded-full bg-amber-400" style={{ width: `${(r.count / maxRegionEvents) * 100}%` }} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by region</CardTitle>
              </CardHeader>
              {data.revenueByRegion.length === 0 && <p className="text-xs text-surface-400">No delivered sales yet.</p>}
              <ul className="space-y-3">
                {data.revenueByRegion.map(r => (
                  <li key={r.regionKey}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-surface-700">{r.regionKey} <span className="text-surface-400 font-normal">({r.orders} orders)</span></span>
                      <span className="font-bold text-surface-900 tabular-nums">{money(r.revenue, r.currencyCode)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-100 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.revenue / maxRegion) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top products</CardTitle>
              </CardHeader>
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-50 text-surface-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-2 font-semibold">Product</th>
                    <th scope="col" className="px-5 py-2 font-semibold">Category</th>
                    <th scope="col" className="px-5 py-2 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.topProducts.length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-6 text-center text-surface-400">No delivered sales yet.</td></tr>
                  )}
                  {data.topProducts.map(p => (
                    <tr key={p.productId} className="hover:bg-surface-50/70 transition-colors">
                      <td className="px-5 py-2.5 font-semibold text-surface-800 max-w-[200px] truncate">{p.name}</td>
                      <td className="px-5 py-2.5 text-surface-500">{p.category}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-surface-900 tabular-nums">{money(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sales by vendor</CardTitle>
            </CardHeader>
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-surface-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Store</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Units</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {data.salesByVendor.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-surface-400">No delivered sales yet.</td></tr>
                )}
                {data.salesByVendor.map(v => (
                  <tr key={v.vendorId} className="hover:bg-surface-50/70 transition-colors">
                    <td className="px-5 py-2.5 font-semibold text-surface-800">{v.storeName}</td>
                    <td className="px-5 py-2.5 text-right text-surface-600 tabular-nums">{v.units.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-surface-900 tabular-nums">{money(v.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by category</CardTitle>
            </CardHeader>
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 text-surface-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Category</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Units</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {data.salesByCategory.length === 0 && (
                  <tr><td colSpan={3} className="px-5 py-6 text-center text-surface-400">No delivered sales yet.</td></tr>
                )}
                {data.salesByCategory.map(c => (
                  <tr key={c.categoryId} className="hover:bg-surface-50/70 transition-colors">
                    <td className="px-5 py-2.5 font-semibold text-surface-800">{c.name}</td>
                    <td className="px-5 py-2.5 text-right text-surface-600 tabular-nums">{c.units.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-surface-900 tabular-nums">{money(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </AdminShell>
  );
}

export default function AdminAnalyticsPage() {
  return <AnalyticsInner />;
}