'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';

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

function FeedStatusBadge({ status, itemCount }: { status: string; itemCount: number }) {
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-red-100/80 text-red-700 border-red-200">
        Failed
      </span>
    );
  }
  if (itemCount === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-amber-100/80 text-amber-700 border-amber-200">
        Empty
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-emerald-100/80 text-emerald-700 border-emerald-200">
      OK
    </span>
  );
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

  return (
    <AdminShell>
      <PageHeader title="Feeds" subtitle="Product feed build health across regions and channels" />

      {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      {!feeds && !error && (
        <div className="bg-surface-raised rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400" aria-busy="true">Loading…</div>
      )}

      {feeds && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Feeds generated</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 [font-variant-numeric:tabular-nums]">{feeds.length.toLocaleString()}</p>
            </div>
            <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Items in latest builds</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 [font-variant-numeric:tabular-nums]">{totalItems.toLocaleString()}</p>
            </div>
            <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Empty feeds</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 [font-variant-numeric:tabular-nums]">{emptyCount}</p>
            </div>
            <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Failed builds</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 [font-variant-numeric:tabular-nums]">{failedCount}</p>
            </div>
          </div>

          <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-hidden">
            <h2 className="text-sm font-bold text-slate-900 px-5 pt-5 pb-3 border-b border-slate-100">Latest build per region × channel</h2>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-2 font-semibold">Region</th>
                  <th scope="col" className="px-5 py-2 font-semibold">Channel</th>
                  <th scope="col" className="px-5 py-2 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Items</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Duration</th>
                  <th scope="col" className="px-5 py-2 font-semibold text-right">Built</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeds.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400">No feed builds recorded yet. Feeds are logged the first time each channel is requested.</td></tr>
                )}
                {feeds.map(f => (
                  <tr key={`${f.regionKey}:${f.channel}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-2.5 font-bold text-slate-900">{f.regionKey}</td>
                    <td className="px-5 py-2.5 text-slate-700">{f.channel}</td>
                    <td className="px-5 py-2.5"><FeedStatusBadge status={f.status} itemCount={f.itemCount} /></td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-800 [font-variant-numeric:tabular-nums]">{f.itemCount.toLocaleString()}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600 [font-variant-numeric:tabular-nums]">{f.durationMs.toLocaleString()} ms</td>
                    <td className="px-5 py-2.5 text-right text-slate-500">{relativeTime(f.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}

export default function AdminFeedsPage() {
  return <FeedsInner />;
}