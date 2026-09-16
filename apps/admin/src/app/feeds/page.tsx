'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatCard, Badge } from '@/components/ui';

interface FeedLog {
  regionKey: string;
  channel: string;
  status: 'SUCCESS' | 'FAILED';
  itemCount: number;
  durationMs: number;
  error?: string | null;
  createdAt: string;
}

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function FeedStatus({ status, itemCount }: { status: string; itemCount: number }) {
  if (status === 'FAILED') return <Badge status="ERROR">Failed</Badge>;
  if (itemCount === 0) return <Badge status="WARNING">Empty</Badge>;
  return <Badge status="SUCCESS">OK</Badge>;
}

function FeedsInner() {
  const [feeds, setFeeds] = useState<FeedLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ feeds: FeedLog[] }>('/api/v1/admin/feeds/latest')
      .then(d => { setFeeds(d.feeds); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  const successful = feeds?.filter(f => f.status === 'SUCCESS');
  const totalItems = successful?.reduce((sum, f) => sum + f.itemCount, 0) ?? 0;
  const failedCount = feeds?.filter(f => f.status === 'FAILED').length ?? 0;
  const emptyCount = successful?.filter(f => f.itemCount === 0).length ?? 0;

  const columns: Column<FeedLog>[] = [
    { key: 'region', header: 'Region', render: f => <span className="font-bold text-surface-900">{f.regionKey}</span> },
    { key: 'channel', header: 'Channel', render: f => f.channel },
    { key: 'status', header: 'Status', render: f => <FeedStatus status={f.status} itemCount={f.itemCount} /> },
    { key: 'items', header: 'Items', align: 'right', render: f => <span className="font-semibold tabular-nums">{f.itemCount.toLocaleString()}</span> },
    { key: 'duration', header: 'Duration', align: 'right', render: f => <span className="tabular-nums">{f.durationMs.toLocaleString()} ms</span> },
    { key: 'built', header: 'Built', align: 'right', render: f => <span className="text-surface-500">{relativeTime(f.createdAt)}</span> },
  ];

  return (
    <AdminShell>
      <PageHeader title="Feeds" subtitle="Product feed build health across regions and channels" />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {feeds && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Feeds generated" value={feeds.length.toLocaleString()} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} />
            <StatCard label="Items in latest builds" value={totalItems.toLocaleString()} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
            <StatCard label="Empty feeds" value={emptyCount.toLocaleString()} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatCard label="Failed builds" value={failedCount.toLocaleString()} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>} />
          </div>

          <div className="mb-2">
            <h2 className="text-[15px] font-bold text-surface-900 tracking-tight">Latest build per region × channel</h2>
            <p className="text-xs text-surface-500 font-medium mt-0.5">Feeds are logged the first time each channel is requested.</p>
          </div>
          <DataTable
            columns={columns}
            rows={feeds}
            rowKey={f => `${f.regionKey}:${f.channel}`}
            minWidth={760}
            emptyTitle="No feed builds recorded yet"
            loadingRows={5}
          />
        </>
      )}
    </AdminShell>
  );
}

export default function AdminFeedsPage() {
  return <FeedsInner />;
}