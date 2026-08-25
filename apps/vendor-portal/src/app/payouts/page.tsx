'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';

interface Payout {
  id: string;
  amountMinorUnits: number;
  currencyCode: string;
  status: string;
  period: string;
  lineCount: number;
  createdAt: string;
}

export default function VendorPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<{ payouts: Payout[] }>('/api/v1/vendors/me/payouts')
      .then(d => setPayouts(d.payouts))
      .catch(() => setError(true));
  }, []);

  const columns: Array<DataTableColumn<Payout>> = [
    { key: 'period', label: 'Period', sortable: true, sortValue: p => p.period },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      sortable: true,
      sortValue: p => p.amountMinorUnits,
      render: p => (
        <span className="font-bold [font-variant-numeric:tabular-nums]">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currencyCode }).format(p.amountMinorUnits / 100)}
        </span>
      ),
    },
    { key: 'lineCount', label: 'Order lines', align: 'right', sortable: true, sortValue: p => p.lineCount },
    { key: 'status', label: 'Status', render: p => <StatusBadge status={p.status} /> },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      sortValue: p => new Date(p.createdAt).getTime(),
      render: p => new Date(p.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <VendorShell>
      <PageHeader title="Payouts" subtitle="Settlements to your connected account" />

      {error && (
        <p role="alert" className="mb-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          Failed to load payouts.
        </p>
      )}

      <DataTable
        columns={columns}
        rows={payouts ?? []}
        loading={payouts === null}
        rowKey={p => p.id}
        emptyTitle="No payouts yet"
        emptyAction={
          <p className="text-xs text-slate-400">Payouts are generated for delivered orders after the settlement window.</p>
        }
        caption="Payout history"
      />
    </VendorShell>
  );
}
