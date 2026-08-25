'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

interface Dashboard {
  productCount: number;
  orderCount: number;
  totalRevenue: number;
  totalPayouts: number;
  recentOrders: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceMinorUnits: number;
    totalMinorUnits: number;
    currencyCode?: string;
    order?: { id: string; orderNumber: string; status: string; createdAt: string };
  }>;
}

interface ApplicationState {
  status: string;
  step: number;
  submittedAt: string | null;
  reviewNotes: string | null;
}

interface SalesPoint {
  label: string;
  value: number;
}

export default function VendorDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);
  const [application, setApplication] = useState<ApplicationState | null | undefined>(undefined);

  useEffect(() => {
    api<{ dashboard: Dashboard }>('/api/v1/vendors/me/dashboard')
      .then(d => setData(d.dashboard))
      .catch(async (err) => {
        if (err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 403) {
          try {
            const app = await api<{ application: ApplicationState | null }>('/api/v1/vendors/application');
            setApplication(app.application);
          } catch {
            setApplication(null);
          }
        }
        setError(true);
      });
  }, []);

  if (application) {
    return <ApplicationPending application={application} />;
  }

  const sales = buildWeeklySales(data);

  const pendingShipments = data
    ? data.recentOrders.filter(o => o.order && ['PAID', 'PROCESSING'].includes(o.order.status)).length
    : 0;

  return (
    <VendorShell>
      <PageHeader title="Dashboard" subtitle="Today at a glance" />

      {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-4 py-3">Failed to load dashboard.</p>}
      {!data && !error && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-lg border border-slate-200 animate-pulse" />)}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8" data-testid="stat-cards">
            <StatCard
              label="Lifetime sales"
              value={money(data.totalRevenue)}
              trend={{ dir: 'flat', note: 'all time' }}
              href="/orders"
            />
            <StatCard
              label="Pending shipments"
              value={String(pendingShipments)}
              tone={pendingShipments > 0 ? 'warning' : 'default'}
              trend={pendingShipments > 0 ? { dir: 'down', note: 'need action' } : { dir: 'up', note: 'all caught up' }}
              href="/orders?status=PROCESSING"
            />
            <StatCard label="Active listings" value={data.productCount.toLocaleString()} href="/products" />
            <StatCard label="Payouts received" value={money(data.totalPayouts)} href="/payouts" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-8">
            {/* Sales bar chart */}
            <section aria-labelledby="sales-heading" className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
              <div className="mb-6">
                <h2 id="sales-heading" className="text-base font-extrabold text-surface-900">Sales by day</h2>
                <p className="text-xs font-medium text-surface-500 mt-1">Derived from your most recent order items (last 7 days)</p>
              </div>
              <div className="flex items-end gap-3 h-48" role="img" aria-label="Bar chart of sales for the last seven days">
                {sales.map(point => {
                  const max = Math.max(...sales.map(s => s.value), 1);
                  const pct = Math.max(8, (point.value / max) * 100);
                  return (
                    <div key={point.label} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                      <span className="text-[10px] font-bold text-surface-400 group-hover:text-brand-600 transition-colors [font-variant-numeric:tabular-nums]">
                        {fmtShort(point.value)}
                      </span>
                      <div
                        className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 opacity-80 group-hover:opacity-100 transition-all shadow-sm"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">{point.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Action items */}
            <section aria-labelledby="actions-heading" className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm">
              <h2 id="actions-heading" className="text-base font-extrabold text-surface-900 mb-5">Action items</h2>
              <ul className="space-y-3 text-sm">
                <ActionItem
                  done={pendingShipments === 0}
                  href="/orders"
                  label={pendingShipments === 0 ? 'All orders fulfilled' : `${pendingShipments} order${pendingShipments === 1 ? '' : 's'} require${pendingShipments === 1 ? 's' : ''} shipping`}
                />
                <ActionItem done={data.productCount > 0} href="/products" label={data.productCount > 0 ? `${data.productCount} listings live` : 'Add your first product'} />
                <ActionItem done={data.totalRevenue > 0} href="/imports" label={data.totalRevenue > 0 ? 'Catalog generating sales' : 'Bulk-import your catalog'} />
              </ul>
            </section>
          </div>

          {/* Recent orders */}
          <section aria-labelledby="recent-heading" className="bg-white rounded-2xl border border-surface-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100">
              <h2 id="recent-heading" className="text-base font-extrabold text-surface-900">Recent orders</h2>
              <Link href="/orders" className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">View all →</Link>
            </div>
            <RecentOrders orders={data.recentOrders} />
          </section>
        </>
      )}
    </VendorShell>
  );
}

function ApplicationPending({ application }: { application: ApplicationState }) {
  const isRejected = application.status === 'REJECTED';
  return (
    <VendorShell>
      <PageHeader title="Seller application" subtitle="Your application status" />
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center max-w-xl mx-auto mt-6" data-testid="applicant-state">
        <span
          aria-hidden="true"
          className={`inline-grid place-items-center w-12 h-12 rounded-full text-xl font-bold ${isRejected ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}
        >
          {isRejected ? '✕' : '⏳'}
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-4">
          {application.status === 'UNDER_REVIEW' && 'Application under review'}
          {application.status === 'PENDING' && 'Application not submitted yet'}
          {application.status === 'REJECTED' && 'Application declined'}
          {!['UNDER_REVIEW', 'PENDING', 'REJECTED'].includes(application.status) && application.status}
        </h2>
        {application.submittedAt && (
          <p className="text-xs text-slate-400 mt-1">Submitted {new Date(application.submittedAt).toLocaleDateString()}</p>
        )}
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          {application.status === 'UNDER_REVIEW' && 'Our team reviews new applications within two working days. We will email your decision — this dashboard unlocks automatically once your store is approved.'}
          {application.status === 'PENDING' && 'You started an application but have not submitted it yet. Finish the remaining steps to send it for review.'}
          {isRejected && 'We were unable to approve your application. You can update your answers and reapply at any time.'}
        </p>
        {isRejected && application.reviewNotes && (
          <div className="mt-4 rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-left">
            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700 mb-1">Reviewer notes</p>
            <p className="text-xs text-slate-600 leading-relaxed">{application.reviewNotes}</p>
          </div>
        )}
        {application.status !== 'UNDER_REVIEW' && (
          <a
            href={process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000/vendor/apply'}
            className="inline-block mt-5 rounded-md bg-primary-500 text-white text-xs font-bold px-5 py-2.5 hover:bg-primary-600"
          >
            {application.status === 'PENDING' ? 'Continue application' : 'Reapply'}
          </a>
        )}
      </div>
    </VendorShell>
  );
}

function RecentOrders({ orders }: { orders: Dashboard['recentOrders'] }) {
  const columns: Array<DataTableColumn<Dashboard['recentOrders'][number]>> = [
    {
      key: 'orderNumber',
      label: 'Order',
      sortable: true,
      sortValue: r => r.order?.orderNumber ?? '',
      render: r => (
        <Link href={`/orders/${r.order?.id ?? ''}`} className="font-mono font-semibold text-indigo-700 hover:underline">
          #{r.order?.orderNumber}
        </Link>
      ),
    },
    { key: 'name', label: 'Item', render: r => <span className="block max-w-[260px] truncate">{r.name}</span> },
    { key: 'quantity', label: 'Qty', align: 'right', sortable: true, sortValue: r => r.quantity },
    { key: 'status', label: 'Status', render: r => (r.order ? <StatusBadge status={r.order.status} /> : '—') },
    {
      key: 'total',
      label: 'Earnings',
      align: 'right',
      sortable: true,
      sortValue: r => r.totalMinorUnits,
      render: r => <span className="font-semibold [font-variant-numeric:tabular-nums]">{money(r.totalMinorUnits)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={orders}
      rowKey={r => r.id}
      emptyTitle="No orders yet"
      emptyAction={<Link href="/products" className="text-xs font-semibold text-indigo-600 hover:underline">List a product →</Link>}
      pageSize={5}
      caption="Five most recent order items"
    />
  );
}

function ActionItem({ done, href, label }: { done: boolean; href: string; label: string }) {
  if (done) {
    return (
      <li className="flex items-center gap-2 text-emerald-700 font-medium">
        <span className="w-4 h-4 rounded-full bg-emerald-100 grid place-items-center text-[9px] shrink-0">✓</span>
        {label}
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className="flex items-center gap-2 rounded-md -mx-2 px-2 py-1.5 hover:bg-amber-50 group">
        <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 grid place-items-center text-[9px] font-bold shrink-0">{''}</span>
        <span className="text-amber-800 font-medium group-hover:underline">{label}</span>
        <svg className="w-3 h-3 ml-auto text-amber-500 icon-directional" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </Link>
    </li>
  );
}

function buildWeeklySales(data: Dashboard | null): SalesPoint[] {
  if (!data || data.recentOrders.length === 0) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ label: d, value: 0 }));
  }
  const days: Array<{ label: string; value: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    days.push({
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 0,
    });
  }
  for (const o of data.recentOrders) {
    if (!o.order) continue;
    const created = new Date(o.order.createdAt);
    const diffDays = Math.floor((Date.now() - created.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays <= 6) {
      days[6 - diffDays].value += o.totalMinorUnits / 100;
    }
  }
  return days;
}

function money(minor: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100);
  } catch {
    return String(minor / 100);
  }
}

function fmtShort(value: number): string {
  if (value >= 100000) return `${Math.round(value / 1000)}k`;
  if (value >= 10000) return `${(value / 1000).toFixed(1)}k`;
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}
