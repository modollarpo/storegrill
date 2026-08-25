'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { inputClass } from '@/components/ui/FormLayout';

interface VendorProduct {
  id: string;
  name: string;
  sku: string;
  status: string;
  basePriceMinorUnits: number;
  currencyCode: string;
  category?: { name?: string } | null;
  variants?: Array<{ id: string; stock: number }>;
}

export default function VendorCatalogPage() {
  const [products, setProducts] = useState<VendorProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStock, setDraftStock] = useState('0');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ products: VendorProduct[] }>('/api/v1/vendors/me/products')
      .then(d => { setProducts(d.products); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  function startEdit(p: VendorProduct) {
    setEditingId(p.id);
    setDraftStock(String(p.variants?.[0]?.stock ?? 0));
  }

  async function saveStock(p: VendorProduct) {
    if (savingId) return;
    const stock = Number(draftStock);
    if (!Number.isInteger(stock) || stock < 0) {
      toastError('Enter a whole number of 0 or more');
      return;
    }
    setSavingId(p.id);
    try {
      await api(`/api/v1/vendors/me/products/${p.id}/stock`, {
        method: 'PUT',
        body: JSON.stringify({ stock }),
      });
      toastSuccess(`Stock updated for ${p.sku}`);
      setEditingId(null);
      load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setSavingId(null);
    }
  }

  const columns: Array<DataTableColumn<VendorProduct>> = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      sortValue: p => p.name,
      render: p => (
        <span className="block max-w-[280px] truncate font-semibold text-slate-800">{p.name}</span>
      ),
    },
    { key: 'sku', label: 'SKU', sortable: true, sortValue: p => p.sku, render: p => <span className="font-mono text-[10px] text-slate-500">{p.sku}</span> },
    { key: 'category', label: 'Category', render: p => <span className="text-slate-500">{p.category?.name ?? '—'}</span> },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      sortable: true,
      sortValue: p => p.basePriceMinorUnits,
      render: p => (
        <span className="[font-variant-numeric:tabular-nums]">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currencyCode }).format(p.basePriceMinorUnits / 100)}
        </span>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      align: 'right',
      sortable: true,
      sortValue: p => p.variants?.[0]?.stock ?? 0,
      render: p =>
        editingId === p.id ? (
          <span className="inline-flex items-center gap-1.5 justify-end" data-testid="stock-editor">
            <input
              type="number"
              min={0}
              value={draftStock}
              onChange={e => setDraftStock(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void saveStock(p); }}
              aria-label={`New stock for ${p.sku}`}
              autoFocus
              className={`${inputClass} !h-7 !w-20 text-right`}
            />
            <button
              type="button"
              onClick={() => void saveStock(p)}
              disabled={savingId === p.id}
              aria-label={`Save stock for ${p.sku}`}
              className="w-6 h-6 rounded bg-indigo-600 text-white grid place-items-center hover:bg-indigo-700 disabled:opacity-50"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              aria-label={`Cancel stock edit for ${p.sku}`}
              className="w-6 h-6 rounded border border-slate-300 text-slate-500 grid place-items-center hover:bg-slate-50"
            >
              ✕
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => startEdit(p)}
            data-testid={`stock-${p.sku}`}
            aria-label={`Edit stock for ${p.sku}`}
            className={p.variants?.[0]?.stock === 0 ? 'text-rose-600 font-bold hover:underline' : 'hover:text-indigo-600 hover:underline'}
          >
            {(p.variants?.[0]?.stock ?? 0).toLocaleString()}
          </button>
        ),
    },
    { key: 'status', label: 'Status', render: p => <StatusBadge status={p.status} /> },
  ];

  return (
    <VendorShell>
      <PageHeader title="Catalog" subtitle="Click a stock count to adjust inventory — every change is ledger-logged" />

      {error && <p role="alert" className="mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</p>}

      <DataTable
        columns={columns}
        rows={products ?? []}
        loading={products === null}
        rowKey={p => p.id}
        emptyTitle="Your catalog is empty"
        emptyAction={<Link href="/imports" className="text-xs font-semibold text-indigo-600 hover:underline">Bulk-import via CSV →</Link>}
        caption="Products in your catalog"
      />
    </VendorShell>
  );
}
