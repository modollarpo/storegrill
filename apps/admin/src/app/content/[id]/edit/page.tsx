'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { ContentForm } from '@/components/ContentForm';

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: string;
  regionKey: string | null;
}

function EditContentInner() {
  const params = useParams<{ id: string }>();
  const [page, setPage] = useState<ContentPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ page: ContentPage }>(`/api/v1/admin/content/${params.id}`)
      .then(d => { setPage(d.page); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, [params.id]);

  useEffect(load, [load]);

  return (
    <AdminShell>
      <PageHeader title="Edit Content Page" subtitle="Update page content and visibility" />
      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
      {!page && !error && <div className="bg-surface-raised rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">Loading…</div>}
      {page && <ContentForm mode="edit" initial={page} />}
    </AdminShell>
  );
}

export default function EditContentPage() {
  return <EditContentInner />;
}