'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { DataTable, type Column, StatusBadge, Button, Toolbar, Field, Input } from '@/components/ui';

interface AdminRegion {
  key: string;
  name: string;
  languages: string;
  defaultLanguage: string;
  currencies: string;
  defaultCurrency: string;
  defaultTimezone: string;
  enabled: boolean;
  createdAt: string;
  _count?: { products: number };
}

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

const EMPTY_FORM = {
  key: '',
  name: '',
  languages: '',
  defaultLanguage: '',
  currencies: '',
  defaultCurrency: '',
  defaultTimezone: '',
};

export default function AdminRegionsPage() {
  const [regions, setRegions] = useState<AdminRegion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    api<{ regions: AdminRegion[] }>('/api/v1/admin/regions')
      .then(d => { setRegions(d.regions); setError(null); })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  function set<K extends keyof typeof EMPTY_FORM>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function createRegion(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        key: form.key.trim().toUpperCase(),
        name: form.name.trim(),
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        defaultLanguage: form.defaultLanguage.trim(),
        currencies: form.currencies.split(',').map(s => s.trim()).filter(Boolean),
        defaultCurrency: form.defaultCurrency.trim().toUpperCase(),
        defaultTimezone: form.defaultTimezone.trim(),
      };
      await api('/api/v1/admin/regions', { method: 'POST', body: JSON.stringify(payload) });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<AdminRegion>[] = [
    { key: 'key', header: 'Key', render: r => <span className="font-mono font-bold text-surface-700">{r.key}</span> },
    { key: 'name', header: 'Name', render: r => <span className="font-semibold text-surface-800">{r.name}</span> },
    {
      key: 'languages',
      header: 'Languages',
      render: r => (
        <span className="text-xs">
          {parseList(r.languages).join(', ')}
          <span className="text-surface-400"> · default {r.defaultLanguage}</span>
        </span>
      ),
    },
    {
      key: 'currencies',
      header: 'Currencies',
      render: r => (
        <span className="text-xs">
          {parseList(r.currencies).join(', ')}
          <span className="text-surface-400"> · default {r.defaultCurrency}</span>
        </span>
      ),
    },
    { key: 'timezone', header: 'Timezone', render: r => <span className="text-surface-500 text-xs">{r.defaultTimezone}</span> },
    { key: 'products', header: 'Products', align: 'right', render: r => <span className="tabular-nums">{r._count?.products ?? 0}</span> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.enabled ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  return (
    <AdminShell>
      <PageHeader
        title="Regions"
        subtitle="Localized markets — currency, language, tax and shipping configuration is data, not code"
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ New region'}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={createRegion} className="bg-white border border-surface-200 rounded-xl p-6 mb-6 shadow-xs">
          <h3 className="text-[15px] font-bold text-surface-900 mb-4">New region</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Key" required>
              <Input id="r-key" required value={form.key} onChange={e => set('key', e.target.value)} placeholder="US" className="font-mono uppercase" />
            </Field>
            <Field label="Name" required>
              <Input id="r-name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="United States" />
            </Field>
            <Field label="Languages (comma-separated)" required>
              <Input id="r-languages" required value={form.languages} onChange={e => set('languages', e.target.value)} placeholder="en, es" />
            </Field>
            <Field label="Default language" required>
              <Input id="r-default-language" required value={form.defaultLanguage} onChange={e => set('defaultLanguage', e.target.value)} placeholder="en" />
            </Field>
            <Field label="Currencies (comma-separated)" required>
              <Input id="r-currencies" required value={form.currencies} onChange={e => set('currencies', e.target.value)} placeholder="USD, MXN" />
            </Field>
            <Field label="Default currency" required>
              <Input id="r-default-currency" required maxLength={3} value={form.defaultCurrency} onChange={e => set('defaultCurrency', e.target.value)} placeholder="USD" className="font-mono uppercase" />
            </Field>
            <Field label="Default timezone" required className="sm:col-span-2">
              <Input id="r-timezone" required value={form.defaultTimezone} onChange={e => set('defaultTimezone', e.target.value)} placeholder="America/New_York" />
            </Field>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="success" loading={submitting}>
                {submitting ? 'Creating…' : 'Create region'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      <Toolbar className="mb-4">
        <span className="text-xs text-surface-400 font-medium tabular-nums">{regions ? `${regions.length} regions` : ''}</span>
      </Toolbar>

      <DataTable
        columns={columns}
        rows={regions}
        rowKey={r => r.key}
        minWidth={880}
        emptyTitle="No regions yet"
        emptyBody="Create one to configure a market."
        loadingRows={6}
      />
    </AdminShell>
  );
}