'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';

interface AdminReview {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  status: string;
  createdAt: string;
  user?: { name?: string };
  product?: { name?: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ reviews: AdminReview[] }>('/api/v1/admin/reviews?status=PENDING')
      .then(d => { setReviews(d.reviews); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  async function moderate(id: string, status: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await api(`/api/v1/admin/reviews/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <PageHeader title="Review Moderation" subtitle="Pending reviews awaiting a decision" />

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="grid gap-3">
        {reviews === null && <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />}
        {reviews?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">
            ✓ Moderation queue is clear.
          </div>
        )}
        {reviews?.map(r => (
          <article key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              <span className="text-amber-500 text-xs tracking-tight" aria-label={`${r.rating} out of 5 stars`}>
                {'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span>
              </span>
              {r.title && <h2 className="text-sm font-bold text-slate-900">{r.title}</h2>}
              <span className="text-[10px] text-slate-400 ml-auto">
                on <strong className="text-slate-600">{r.product?.name ?? 'product'}</strong> · by {r.user?.name ?? 'user'} · {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </header>
            {r.body && <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">{r.body}</p>}
            <div className="flex gap-1.5">
              <button type="button" disabled={busyId === r.id} onClick={() => moderate(r.id, 'APPROVED')} className="rounded-md bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 hover:bg-emerald-500 disabled:opacity-50">Approve & publish</button>
              <button type="button" disabled={busyId === r.id} onClick={() => moderate(r.id, 'REJECTED')} className="rounded-md border border-red-300 text-red-700 text-[10px] font-bold px-3 py-1.5 hover:bg-red-50 disabled:opacity-50">Reject</button>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
