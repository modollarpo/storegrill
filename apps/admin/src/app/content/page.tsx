'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatusBadge, Badge, Button } from '@/components/ui';

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: string;
  regionKey: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

function ContentInner() {
  const [pages, setPages] = useState<ContentPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ pages: ContentPage[] }>('/api/v1/admin/content')
      .then(d => { setPages(d.pages); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  async function publish(id: string, status: 'DRAFT' | 'PUBLISHED') {
    const page = pages?.find(p => p.id === id);
    if (!page) return;
    setBusyId(id);
    try {
      await api(`/api/v1/admin/content/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ slug: page.slug, title: page.title, body: page.body, status, regionKey: page.regionKey }),
      });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this content page?')) return;
    setBusyId(id);
    try {
      await api(`/api/v1/admin/content/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<ContentPage>[] = [
    { key: 'title', header: 'Title', render: p => <span className="font-semibold text-surface-900 max-w-[260px] truncate block">{p.title}</span> },
    { key: 'slug', header: 'Slug', render: p => <code className="text-surface-500 font-mono text-xs">/{p.slug}</code> },
    { key: 'region', header: 'Region', render: p => p.regionKey ? <Badge>{p.regionKey}</Badge> : <span className="text-surface-400">Global</span> },
    { key: 'status', header: 'Status', render: p => <StatusBadge status={p.status} /> },
    { key: 'updated', header: 'Updated', render: p => <span className="text-surface-500">{new Date(p.updatedAt).toLocaleDateString()}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: p => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant={p.status === 'DRAFT' ? 'success' : 'secondary'}
            loading={busyId === p.id}
            onClick={() => publish(p.id, p.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT')}
          >
            {p.status === 'DRAFT' ? 'Publish' : 'Unpublish'}
          </Button>
          <Link href={`/content/${p.id}/edit`} className="inline-flex items-center h-7 px-2.5 text-[11px] font-semibold rounded-lg text-surface-700 border border-surface-200 bg-white hover:bg-surface-50 transition-colors">
            Edit
          </Link>
          <Button size="sm" variant="dangerOutline" loading={busyId === p.id} onClick={() => remove(p.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell>
      <PageHeader
        title="Content Pages"
        subtitle="Manage CMS pages rendered on the storefront"
        actions={<Link href="/content/new" className="inline-flex items-center gap-1.5 rounded-lg bg-surface-900 hover:bg-surface-800 text-white text-xs font-semibold px-3.5 py-2 transition-colors shadow-xs">New page</Link>}
      />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={pages}
        rowKey={p => p.id}
        minWidth={800}
        emptyTitle="No content pages yet"
        emptyBody="Create one to get started."
        loadingRows={5}
      />
    </AdminShell>
  );
}

export default function AdminContentPage() {
  return <ContentInner />;
}