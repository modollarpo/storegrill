'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

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

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Content Pages" subtitle="Manage CMS pages rendered on the storefront" />
        <Link href="/content/new" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-2 transition-colors">
          New page
        </Link>
      </div>

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Title</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Slug</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Region</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Updated</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pages === null && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {pages?.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400">No content pages yet. Create one to get started.</td></tr>
            )}
            {pages?.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-semibold text-slate-800 max-w-[260px] truncate">{p.title}</td>
                <td className="px-5 py-3 font-mono text-slate-500">/{p.slug}</td>
                <td className="px-5 py-3">{p.regionKey ?? 'Global'}</td>
                <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-3 text-slate-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {p.status === 'DRAFT' ? (
                      <button type="button" disabled={busyId === p.id} onClick={() => publish(p.id, 'PUBLISHED')}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50">Publish</button>
                    ) : (
                      <button type="button" disabled={busyId === p.id} onClick={() => publish(p.id, 'DRAFT')}
                        className="text-slate-500 hover:text-slate-700 font-semibold disabled:opacity-50">Unpublish</button>
                    )}
                    <Link href={`/content/${p.id}/edit`} className="text-indigo-600 hover:text-indigo-800 font-semibold">Edit</Link>
                    <button type="button" disabled={busyId === p.id} onClick={() => remove(p.id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold disabled:opacity-50">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export default function AdminContentPage() {
  return <ContentInner />;
}