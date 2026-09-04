'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface ImportJob {
  id: string;
  type: string;
  source: string;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  createdAt: string;
}

const ACCEPTED_MIME = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain']);
const ACCEPTED_EXT = /\.csv$/i;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function VendorImportsPage() {
  const [jobs, setJobs] = useState<ImportJob[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ jobs?: ImportJob[]; imports?: ImportJob[] }>('/api/v1/imports')
      .then(d => setJobs(d.jobs ?? d.imports ?? []))
      .catch(() => setJobs([]));
  }, []);

  useEffect(load, [load]);

  async function uploadCsv(file: File) {
    if (!ACCEPTED_EXT.test(file.name) || (!ACCEPTED_MIME.has(file.type) && file.type !== '')) {
      toastError('Only .csv files are accepted');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toastError('File exceeds the 10 MB limit');
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api('/api/v1/imports/csv', { method: 'POST', body: fd });
      toastSuccess(`“${file.name}” uploaded — import queued`);
      load();
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function importFromUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//i.test(url)) {
      toastError('Enter a valid http(s) feed URL');
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      await api('/api/v1/imports/url', { method: 'POST', body: JSON.stringify({ url }) });
      toastSuccess('Feed import scheduled');
      setUrl('');
      load();
    } catch (e2) {
      toastError(e2 instanceof ApiError ? e2.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  }

  const columns: Array<DataTableColumn<ImportJob>> = [
    { key: 'createdAt', label: 'Date', sortable: true, sortValue: j => new Date(j.createdAt).getTime(), render: j => new Date(j.createdAt).toLocaleString() },
    { key: 'type', label: 'Method', sortable: true, sortValue: j => `${j.type} ${j.source}`, render: j => <span className="font-semibold uppercase">{j.type}{j.source ? ` · ${j.source}` : ''}</span> },
    { key: 'totalRows', label: 'Rows', align: 'right', sortable: true, sortValue: j => j.totalRows },
    { key: 'successRows', label: 'OK', align: 'right', sortable: true, sortValue: j => j.successRows, render: j => <span className="text-emerald-700 font-semibold">{j.successRows}</span> },
    { key: 'errorRows', label: 'Errors', align: 'right', sortable: true, sortValue: j => j.errorRows, render: j => j.errorRows > 0 ? <span className="text-rose-700 font-bold">{j.errorRows}</span> : <span className="text-slate-300">0</span> },
    { key: 'status', label: 'Status', render: j => <StatusBadge status={j.status} /> },
  ];

  return (
    <VendorShell>
      <PageHeader title="Bulk Imports" subtitle="CSV upload or scheduled feed URL — rows are validated before anything goes live" />

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <section aria-labelledby="csv-heading" className="bg-surface-raised rounded-lg border border-slate-200 p-5">
          <h2 id="csv-heading" className="text-sm font-bold text-slate-900 mb-3">CSV upload</h2>
          <div
            ref={dropRef}
            data-testid="dropzone"
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { if (!dropRef.current?.contains(e.relatedTarget as Node)) setDragging(false); }}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void uploadCsv(file);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            aria-disabled={uploading}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors',
              dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
            )}
          >
            <svg className={cn('w-8 h-8 mb-2', uploading ? 'animate-bounce text-indigo-500' : 'text-slate-400')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <p className="text-xs font-semibold text-slate-700">{uploading ? 'Uploading…' : dragging ? 'Drop to upload' : 'Drag & drop a CSV, or click to browse'}</p>
            <p className="text-[10px] text-slate-400 mt-1">Max 10 MB · .csv only</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void uploadCsv(f);
            }}
            aria-label="Choose CSV file"
          />
        </section>

        <section aria-labelledby="url-heading" className="bg-surface-raised rounded-lg border border-slate-200 p-5">
          <h2 id="url-heading" className="text-sm font-bold text-slate-900 mb-1">Feed URL</h2>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">HTTP(S) JSON or CSV feed with webhook signature validation.</p>
          <form onSubmit={importFromUrl} className="space-y-2">
            <label htmlFor="feed-url" className="sr-only">Feed URL</label>
            <input
              id="feed-url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://supplier.example/feed.json"
              inputMode="url"
              className="w-full h-9 rounded-md border border-slate-300 px-3 text-xs placeholder:text-slate-400 focus:border-indigo-500 outline-none"
            />
            <button
              type="submit"
              disabled={uploading}
              className="h-9 w-full rounded-md bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? 'Working…' : 'Import from feed'}
            </button>
          </form>
        </section>
      </div>

      {message && (
        <p role={message.kind === 'err' ? 'alert' : 'status'} className={`mb-4 text-xs rounded-md px-3 py-2 border ${message.kind === 'ok' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
          {message.text}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={jobs ?? []}
        loading={jobs === null}
        rowKey={j => j.id}
        emptyTitle="No imports yet"
        emptyAction={<p className="text-xs text-slate-400">Upload a CSV above — errors are reported row-by-row.</p>}
        caption="Import job history"
      />
    </VendorShell>
  );
}
