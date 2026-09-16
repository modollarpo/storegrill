'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatusBadge, Button, Toolbar, Select } from '@/components/ui';

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

  const columns: Column<AdminProduct>[] = [
    { key: 'product', header: 'Product', render: p => <span className="font-semibold text-surface-900 max-w-[280px] truncate block">{p.name}</span> },
    { key: 'vendor', header: 'Vendor', render: p => p.vendor?.storeName ?? '—' },
    { key: 'category', header: 'Category', render: p => <span className="text-surface-500">{p.category?.name ?? '—'}</span> },
    {
      key: 'price',
      header: 'Price',
      render: p => (
        <span className="font-bold text-surface-900 tabular-nums">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currencyCode }).format(p.basePriceMinorUnits / 100)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: p => <StatusBadge status={p.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: p => (
        <div className="flex justify-end gap-2">
          {p.status !== 'ACTIVE' && (
            <Button size="sm" variant="success" loading={busyId === p.id} onClick={() => setStatus(p.id, 'ACTIVE')}>
              Approve
            </Button>
          )}
          {p.status !== 'INACTIVE' && (
            <Button size="sm" variant="dangerOutline" loading={busyId === p.id} onClick={() => setStatus(p.id, 'INACTIVE')}>
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader title="Products" subtitle="Moderate the catalog" />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <Toolbar className="mb-4">
        <Select
          id="prod-status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs w-48"
          aria-label="Filter by product status"
        >
          <option value="">All statuses</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DRAFT">Draft</option>
        </Select>
        <span className="text-xs text-surface-400 font-medium tabular-nums">
          {products ? `${products.length} shown` : ''}
        </span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={products}
        rowKey={p => p.id}
        minWidth={820}
        emptyTitle="No products match this filter"
        loadingRows={6}
      />
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