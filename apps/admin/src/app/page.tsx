'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

interface Dashboard {
  userCount: number;
  vendorCount: number;
  productCount: number;
  orderCount: number;
  totalRevenue: number;
  pendingVendors: number;
  pendingProducts: number;
  recentOrders: Array<{
    id: string; orderNumber: string; status: string; createdAt: string; currencyCode: string; totalMinorUnits: number;
    user: { name: string; email: string };
    items: Array<{ totalMinorUnits: number }>;
  }>;
}

const STAT_CARDS = [
  { key: 'orderCount', label: 'Total Orders', href: '/orders', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { key: 'userCount', label: 'Customers', href: '/vendors', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'productCount', label: 'Active Products', href: '/products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'vendorCount', label: 'Active Vendors', href: '/vendors', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
] as const;

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<{ dashboard: Dashboard }>('/api/v1/admin/dashboard')
      .then(d => setData(d.dashboard))
      .catch(() => setError(true));
  }, []);

  return (
    <AdminShell>
      <PageHeader title="Dashboard" subtitle="Marketplace health at a glance" />

      {error && (
        <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="text-sm font-bold text-red-800">Failed to load dashboard data</h3>
            <p className="text-xs text-red-600 mt-1">Please check your connection and try refreshing the page.</p>
          </div>
        </div>
      )}

      {!data && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-surface-200/50 animate-pulse" />)}
        </div>
      )}

      {data && (
        <>
          {(data.pendingVendors > 0 || data.pendingProducts > 0) && (
            <div className="mb-8 flex flex-wrap gap-4">
              {data.pendingVendors > 0 && (
                <Link href="/vendors?status=PENDING" className="inline-flex items-center gap-2 text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                  {data.pendingVendors} vendor{data.pendingVendors === 1 ? '' : 's'} awaiting approval
                </Link>
              )}
              {data.pendingProducts > 0 && (
                <Link href="/products?status=PENDING_REVIEW" className="inline-flex items-center gap-2 text-sm font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                  {data.pendingProducts} product{data.pendingProducts === 1 ? '' : 's'} pending review
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-10">
            {STAT_CARDS.map(card => (
              <Link key={card.key} href={card.href} className="group bg-white rounded-2xl border border-surface-200 p-6 hover:border-brand-400 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-surface-500 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                  <svg className="w-4 h-4 text-surface-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all group-hover:text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
                <p className="text-3xl font-extrabold text-surface-900 tabular-nums tracking-tight">{data[card.key].toLocaleString()}</p>
                <p className="text-sm font-medium text-surface-500 mt-1">{card.label}</p>
              </Link>
            ))}
            
            <div className="bg-gradient-to-br from-surface-900 to-surface-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4 backdrop-blur-sm border border-white/10">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <p className="text-3xl font-extrabold tabular-nums tracking-tight">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalRevenue / 100)}
                </p>
                <p className="text-sm font-medium text-surface-300 mt-1">Delivered Revenue</p>
              </div>
            </div>
          </div>

          <section aria-label="Recent orders" className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
            <header className="flex items-center justify-between px-6 py-5 border-b border-surface-200 bg-surface-50/50">
              <h2 className="text-base font-extrabold text-surface-900">Recent Orders</h2>
              <Link href="/orders" className="text-sm text-brand-600 hover:text-brand-700 font-bold transition-colors">View all →</Link>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4">Order</th>
                    <th scope="col" className="px-6 py-4">Customer</th>
                    <th scope="col" className="px-6 py-4">Status</th>
                    <th scope="col" className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {data.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-surface-500 text-sm">No recent orders</td>
                    </tr>
                  ) : (
                    data.recentOrders.map(o => (
                      <tr key={o.id} className="hover:bg-surface-50/50 transition-colors group cursor-pointer">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-surface-900 group-hover:text-brand-600 transition-colors">#{o.orderNumber}</span>
                          <span className="block text-xs text-surface-500 mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="block font-medium text-surface-900">{o.user?.name || 'Guest'}</span>
                          <span className="block text-xs text-surface-500 mt-0.5">{o.user?.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-surface-900 tabular-nums">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: o.currencyCode }).format(o.totalMinorUnits / 100)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
