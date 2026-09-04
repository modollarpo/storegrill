'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface ContentFormProps {
  mode: 'create' | 'edit';
  initial?: { id: string; slug: string; title: string; body: string; status: string; regionKey: string | null };
}

export function ContentForm({ mode, initial }: ContentFormProps) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(initial?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');
  const [regionKey, setRegionKey] = useState(initial?.regionKey ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-surface-raised';

  async function save(statusOverride?: 'DRAFT' | 'PUBLISHED') {
    setBusy(true);
    setError(null);
    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      body,
      status: statusOverride ?? status,
      regionKey: regionKey.trim() || null,
    };
    try {
      if (mode === 'edit' && initial) {
        await api(`/api/v1/admin/content/${initial.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/v1/admin/content', { method: 'POST', body: JSON.stringify(payload) });
      }
      router.push('/content');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="cp-title" className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
          <input id="cp-title" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="About us" />
        </div>
        <div>
          <label htmlFor="cp-slug" className="block text-xs font-semibold text-slate-600 mb-1">Slug</label>
          <input id="cp-slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className={`${inputClass} font-mono`} placeholder="about-us" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="cp-status" className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
          <select id="cp-status" value={status} onChange={e => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')} className={inputClass}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        <div>
          <label htmlFor="cp-region" className="block text-xs font-semibold text-slate-600 mb-1">Region (blank = global)</label>
          <input id="cp-region" value={regionKey} onChange={e => setRegionKey(e.target.value.toUpperCase())} className={`${inputClass} font-mono`} placeholder="UK" maxLength={10} />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="cp-body" className="block text-xs font-semibold text-slate-600 mb-1">Body (Markdown/HTML)</label>
        <textarea id="cp-body" value={body} onChange={e => setBody(e.target.value)} rows={14} className={`${inputClass} font-mono resize-y`} placeholder="Content goes here…" />
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => save(status)} disabled={busy || !title.trim() || !slug.trim()}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 transition-colors disabled:opacity-50">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => save('PUBLISHED')} disabled={busy || !title.trim() || !slug.trim()}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 transition-colors disabled:opacity-50">
          Publish
        </button>
      </div>
    </div>
  );
}