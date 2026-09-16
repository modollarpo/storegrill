'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { Card, Button, Badge, Skeleton } from '@/components/ui';

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

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {reviews === null && (
          <>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </>
        )}
        {reviews?.length === 0 && (
          <Card className="py-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-surface-800">Moderation queue is clear</p>
              <p className="text-xs text-surface-500 mt-1">No reviews are waiting for a decision.</p>
            </div>
          </Card>
        )}
        {reviews?.map(r => (
          <Card key={r.id}>
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
              <span className="text-amber-500 text-xs tracking-tight" aria-label={`${r.rating} out of 5 stars`}>
                {'★'.repeat(r.rating)}<span className="text-surface-300">{'★'.repeat(5 - r.rating)}</span>
              </span>
              {r.title && <h2 className="text-sm font-bold text-surface-900">{r.title}</h2>}
              <Badge status="PENDING_REVIEW">Pending</Badge>
              <span className="text-[11px] text-surface-400 ml-auto">
                on <strong className="text-surface-600">{r.product?.name ?? 'product'}</strong> · by {r.user?.name ?? 'user'} · {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </header>
            {r.body && <p className="text-xs text-surface-600 leading-relaxed line-clamp-3 mb-4">{r.body}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="success" loading={busyId === r.id} onClick={() => moderate(r.id, 'APPROVED')}>
                Approve & publish
              </Button>
              <Button size="sm" variant="dangerOutline" loading={busyId === r.id} onClick={() => moderate(r.id, 'REJECTED')}>
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}