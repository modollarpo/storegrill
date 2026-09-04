'use client';

import { VendorShell, PageHeader } from '@/components/VendorShell';
import { ProductForm } from '@/components/ProductForm';

export default function NewProductPage() {
  return (
    <VendorShell>
      <PageHeader title="New product" subtitle="Add an item to your catalog" />
      <ProductForm mode="create" />
    </VendorShell>
  );
}