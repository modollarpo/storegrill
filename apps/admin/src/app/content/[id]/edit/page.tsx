'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { ContentForm } from '@/components/ContentForm';
import { Card, Skeleton } from '@/components/ui';

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
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}
      {!page && !error && <Card><Skeleton className="h-10 rounded-lg" /></Card>}
      {page && <ContentForm mode="edit" initial={page} />}
    </AdminShell>
  );
}

export default function EditContentPage() {
  return <EditContentInner />;
}