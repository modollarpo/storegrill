'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { StatCard, Card, CardHeader, CardTitle } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui';
import { StatusBadge } from '@/components/ui';
import { Skeleton } from '@/components/ui';

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

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  currencyCode: string;
  totalMinorUnits: number;
  user?: { name?: string; email?: string };
  items?: Array<{ totalMinorUnits: number }>;
}

const columns: Column<AdminOrder>[] = [
  {
    key: 'order',
    header: 'Order',
    render: o => (
      <div>
        <span className="font-mono font-bold text-surface-900">#{o.orderNumber}</span>
        <span className="block text-xs text-surface-500 mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</span>
      </div>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    render: o => (
      <div>
        <span className="block font-medium text-surface-900">{o.user?.name || 'Guest'}</span>
        <span className="block text-xs text-surface-500 mt-0.5">{o.user?.email}</span>
      </div>
    ),
  },
  { key: 'status', header: 'Status', render: o => <StatusBadge status={o.status} /> },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    render: o => (
      <span className="font-bold text-surface-900 tabular-nums">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: o.currencyCode }).format(o.totalMinorUnits / 100)}
      </span>
    ),
  },
];

const FALLBACK_ICONS = {
  orders: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
  users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  vendors: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
} as const;

function TankIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

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
        <div className="bg-red-50/60 border border-red-200 rounded-xl p-5 flex items-start gap-3 mb-6">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 className="text-sm font-bold text-red-800">Failed to load dashboard data</h3>
            <p className="text-xs text-red-600 mt-1">Please check your connection and try refreshing the page.</p>
          </div>
        </div>
      )}

      {!data && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      )}

      {data && (
        <>
          {(data.pendingVendors > 0 || data.pendingProducts > 0) && (
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
              {data.pendingVendors > 0 && (
                <Link href="/vendors?status=PENDING" className="inline-flex items-center gap-2.5 text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                  {data.pendingVendors} vendor{data.pendingVendors === 1 ? '' : 's'} awaiting approval
                </Link>
              )}
              {data.pendingProducts > 0 && (
                <Link href="/products?status=PENDING_REVIEW" className="inline-flex items-center gap-2.5 text-sm font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
                  {data.pendingProducts} product{data.pendingProducts === 1 ? '' : 's'} pending review
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
            <StatCard label="Total Orders" value={data.orderCount.toLocaleString()} href="/orders" icon={<TankIcon d={FALLBACK_ICONS.orders} />} />
            <StatCard label="Customers" value={data.userCount.toLocaleString()} href="/vendors" icon={<TankIcon d={FALLBACK_ICONS.users} />} />
            <StatCard label="Active Products" value={data.productCount.toLocaleString()} href="/products" icon={<TankIcon d={FALLBACK_ICONS.products} />} />
            <StatCard label="Active Vendors" value={data.vendorCount.toLocaleString()} href="/vendors" icon={<TankIcon d={FALLBACK_ICONS.vendors} />} />
          </div>

          <div className="mb-8 rounded-xl bg-gradient-to-br from-surface-900 to-surface-950 text-white border border-surface-800 shadow-lg p-6 flex flex-wrap items-center gap-x-10 gap-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-extrabold tabular-nums tracking-tight">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.totalRevenue / 100)}
                </p>
                <p className="text-xs font-medium text-surface-300 mt-0.5">Delivered revenue</p>
              </div>
            </div>
            <div className="hidden md:block h-10 w-px bg-white/10" aria-hidden="true" />
            <p className="text-sm text-surface-400 leading-relaxed max-w-sm">
              Lifetime revenue from orders on this pod. Settlements are split per vendor before payout.
            </p>
            <Link href="/orders" className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg px-4 py-2.5 transition-colors">
              View orders →
            </Link>
          </div>

          <Card padding={false}>
            <CardHeader className="px-6 py-5">
              <CardTitle>Recent Orders</CardTitle>
              <Link href="/orders" className="text-[13px] font-bold text-brand-600 hover:text-brand-700 transition-colors">
                View all →
              </Link>
            </CardHeader>
            <DataTable
              columns={columns}
              rows={data.recentOrders}
              rowKey={o => o.id}
              minWidth={640}
              loadingRows={4}
              emptyTitle="No recent orders"
              emptyBody="Orders will appear here as customers check out."
            />
          </Card>
        </>
      )}
    </AdminShell>
  );
}