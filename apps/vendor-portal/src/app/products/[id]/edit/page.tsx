'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { ProductForm, type ProductFormInitial } from '@/components/ProductForm';

interface ApiProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  status: string;
  description?: string | null;
  shortDescription?: string | null;
  categoryId: string;
  currencyCode: string;
  basePriceMinorUnits: number;
  weightGrams?: number | null;
  images: string[];
  tags: string[];
  attributes: string | Array<{ name: string; value: string }>;
}

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductFormInitial | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ products: ApiProduct[] }>('/api/v1/vendors/me/products')
      .then(d => {
        const p = d.products.find(x => x.id === params.id);
        if (!p) {
          setNotFound(true);
          return;
        }
        setProduct({
          ...p,
          attributes: typeof p.attributes === 'string'
            ? (() => { try { return JSON.parse(p.attributes); } catch { return []; } })()
            : p.attributes,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <VendorShell>
      <PageHeader title="Edit product" subtitle="Update listing details" />
      {loading ? (
        <div className="bg-surface-raised rounded-lg border border-slate-200 p-10 text-center text-sm font-medium text-slate-500" aria-busy="true">Loading product…</div>
      ) : notFound || !product ? (
        <div className="bg-surface-raised rounded-lg border border-slate-200 p-10 text-center">
          <p className="text-sm font-semibold text-slate-700">Product not found</p>
          <p className="text-xs text-slate-500 mt-1">It may have been deleted, or it belongs to another store.</p>
        </div>
      ) : (
        <ProductForm mode="edit" product={product} />
      )}
    </VendorShell>
  );
}