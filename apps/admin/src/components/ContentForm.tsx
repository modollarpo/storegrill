'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Card, Field, Input, Select, Button } from '@/components/ui';

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
    <Card>
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Field label="Title">
          <Input id="cp-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="About us" />
        </Field>
        <Field label="Slug">
          <Input
            id="cp-slug"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            placeholder="about-us"
            className="font-mono"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <Field label="Status">
          <Select id="cp-status" value={status} onChange={e => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </Select>
        </Field>
        <Field label="Region (blank = global)">
          <Input id="cp-region" value={regionKey} onChange={e => setRegionKey(e.target.value.toUpperCase())} placeholder="UK" maxLength={10} className="font-mono" />
        </Field>
      </div>

      <div className="mb-5">
        <Field label="Body (Markdown/HTML)">
          <textarea
            id="cp-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={14}
            placeholder="Content goes here…"
            className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm font-mono text-surface-900 resize-y focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => save(status)} loading={busy} disabled={!title.trim() || !slug.trim()}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="success" onClick={() => save('PUBLISHED')} loading={busy} disabled={!title.trim() || !slug.trim()}>
          Publish
        </Button>
      </div>
    </Card>
  );
}