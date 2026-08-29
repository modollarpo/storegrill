'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface VendorOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  regionKey: string;
  currencyCode: string;
  customerName: string;
  itemCount: number;
  vendorTotalMinorUnits: number;
  trackingNumber: string | null;
}

const STATUS_OPTIONS = ['', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function OrdersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = useState<VendorOrderRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';

  const load = useCallback(() => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (q) sp.set('q', q);
    setRows(null);
    api<{ orders: VendorOrderRow[] }>(`/api/v1/vendors/me/orders?${sp.toString()}`)
      .then(d => { setRows(d.orders); setError(null); })
      .catch(e => setError(e instanceof Error ? e.message : 'Load failed'));
  }, [status, q]);

  useEffect(load, [load]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    router.replace(`/orders?${next.toString()}`, { scroll: false });
  }

  async function bulkShip() {
    if (selected.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    let ok = 0;
    let failed = 0;
    for (const id of selected) {
      try {
        await api(`/api/v1/vendors/me/orders/${id}/ship`, {
          method: 'POST',
          body: JSON.stringify({ carrier: 'Regional Carrier' }),
        });
        ok++;
      } catch {
        failed++;
      }
    }
    setSelected(new Set());
    setBulkBusy(false);
    load();
    if (failed === 0) toastSuccess(`${ok} order${ok === 1 ? '' : 's'} marked as shipped`);
    else if (ok === 0) toastError(`Failed to ship ${failed} order${failed === 1 ? '' : 's'}`);
    else toastError(`${ok} shipped, ${failed} failed — retry the remainder`);
  }

  const columns = useMemo<Array<DataTableColumn<VendorOrderRow>>>(() => [
    {
      key: 'orderNumber',
      label: 'Order',
      sortable: true,
      sortValue: r => r.orderNumber,
      render: r => (
        <Link href={`/orders/${r.id}`} className="font-mono font-semibold text-indigo-700 hover:underline">
          #{r.orderNumber}
        </Link>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      sortable: true,
      sortValue: r => new Date(r.createdAt).getTime(),
      render: r => new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    { key: 'customerName', label: 'Customer', sortable: true, sortValue: r => r.customerName },
    { key: 'regionKey', label: 'Region', render: r => <span className="uppercase font-semibold text-slate-500">{r.regionKey}</span> },
    { key: 'itemCount', label: 'Items', align: 'right', sortable: true, sortValue: r => r.itemCount },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'tracking',
      label: 'Tracking',
      render: r =>
        r.trackingNumber ? (
          <span className="font-mono text-[10px]">{r.trackingNumber}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'total',
      label: 'Your total',
      align: 'right',
      sortable: true,
      sortValue: r => r.vendorTotalMinorUnits,
      render: r => (
        <span className="font-semibold [font-variant-numeric:tabular-nums]">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: r.currencyCode }).format(r.vendorTotalMinorUnits / 100)}
        </span>
      ),
    },
  ], []);

  return (
    <VendorShell>
      <PageHeader title="Orders" subtitle="Every order containing your items" />

      <div className="flex flex-wrap items-center gap-2 mb-3" data-testid="order-filters">
        <label htmlFor="f-status" className="text-xs font-semibold text-slate-600">Status</label>
        <select
          id="f-status"
          value={status}
          onChange={e => setParam('status', e.target.value)}
          className="h-8 rounded-md border border-slate-300 bg-surface-raised px-2 text-xs focus:border-indigo-500 outline-none"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>{s === '' ? 'All statuses' : s}</option>
          ))}
        </select>

        <label htmlFor="f-q" className="sr-only">Search orders</label>
        <input
          id="f-q"
          defaultValue={q}
          onKeyDown={e => { if (e.key === 'Enter') setParam('q', (e.target as HTMLInputElement).value); }}
          onBlur={e => setParam('q', e.target.value)}
          placeholder="Search SKU or order #…"
          className="h-8 w-56 rounded-md border border-slate-300 bg-surface-raised px-2.5 text-xs placeholder:text-slate-400 focus:border-indigo-500 outline-none"
        />

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">{selected.size} selected</span>
            <button
              type="button"
              onClick={bulkShip}
              disabled={bulkBusy}
              data-testid="bulk-ship"
              className="h-8 px-3 rounded-md bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {bulkBusy ? 'Shipping…' : 'Mark as Shipped'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3 rounded-md border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Print packing slips
            </button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</p>}

      <DataTable
        columns={columns}
        rows={rows ?? []}
        loading={rows === null}
        rowKey={r => r.id}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        emptyTitle="No orders yet"
        emptyAction={<Link href="/products" className="text-xs font-semibold text-indigo-600 hover:underline">List a product →</Link>}
        caption="Orders containing this store's items"
      />
    </VendorShell>
  );
}

export default function VendorOrdersPage() {
  return (
    <Suspense fallback={<div className="h-64 rounded-lg bg-surface-raised border border-slate-200 animate-pulse" />}>
      <OrdersInner />
    </Suspense>
  );
}
