'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader, StatusBadge } from '@/components/AdminShell';

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

  const field = 'rounded-md border border-slate-300 text-xs px-3 py-2 w-full bg-surface-raised focus:outline-none focus:ring-2 focus:ring-brand-500/40';

  return (
    <AdminShell>
      <PageHeader title="Regions" subtitle="Localized markets — currency, language, tax and shipping configuration is data, not code" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">{regions ? `${regions.length} regions` : ''}</span>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          className="rounded-md bg-slate-900 text-white text-xs font-bold px-3 py-2 hover:bg-slate-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New region'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createRegion} className="bg-surface-raised rounded-xl border border-slate-200 p-5 mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-key" className="block text-xs font-semibold text-slate-600 mb-1">Key</label>
            <input id="r-key" required value={form.key} onChange={e => set('key', e.target.value)} placeholder="US" className={field} />
          </div>
          <div>
            <label htmlFor="r-name" className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
            <input id="r-name" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="United States" className={field} />
          </div>
          <div>
            <label htmlFor="r-languages" className="block text-xs font-semibold text-slate-600 mb-1">Languages <span className="text-slate-400">(comma-separated)</span></label>
            <input id="r-languages" required value={form.languages} onChange={e => set('languages', e.target.value)} placeholder="en, es" className={field} />
          </div>
          <div>
            <label htmlFor="r-default-language" className="block text-xs font-semibold text-slate-600 mb-1">Default language</label>
            <input id="r-default-language" required value={form.defaultLanguage} onChange={e => set('defaultLanguage', e.target.value)} placeholder="en" className={field} />
          </div>
          <div>
            <label htmlFor="r-currencies" className="block text-xs font-semibold text-slate-600 mb-1">Currencies <span className="text-slate-400">(comma-separated)</span></label>
            <input id="r-currencies" required value={form.currencies} onChange={e => set('currencies', e.target.value)} placeholder="USD, MXN" className={field} />
          </div>
          <div>
            <label htmlFor="r-default-currency" className="block text-xs font-semibold text-slate-600 mb-1">Default currency</label>
            <input id="r-default-currency" required maxLength={3} value={form.defaultCurrency} onChange={e => set('defaultCurrency', e.target.value)} placeholder="USD" className={field} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="r-timezone" className="block text-xs font-semibold text-slate-600 mb-1">Default timezone</label>
            <input id="r-timezone" required value={form.defaultTimezone} onChange={e => set('defaultTimezone', e.target.value)} placeholder="America/New_York" className={field} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-emerald-600 text-white text-xs font-bold px-4 py-2 hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create region'}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      <div className="bg-surface-raised rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[820px]">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Key</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Name</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Languages</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Currencies</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Timezone</th>
              <th scope="col" className="px-5 py-2.5 font-semibold text-right">Products</th>
              <th scope="col" className="px-5 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {regions === null && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400" aria-busy="true">Loading…</td></tr>
            )}
            {regions?.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No regions yet. Create one to configure a market.</td></tr>
            )}
            {regions?.map(r => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono font-bold text-slate-700">{r.key}</td>
                <td className="px-5 py-3 font-semibold text-slate-800">{r.name}</td>
                <td className="px-5 py-3">
                  {parseList(r.languages).join(', ')}
                  <span className="text-slate-400"> · default {r.defaultLanguage}</span>
                </td>
                <td className="px-5 py-3">
                  {parseList(r.currencies).join(', ')}
                  <span className="text-slate-400"> · default {r.defaultCurrency}</span>
                </td>
                <td className="px-5 py-3 text-slate-500">{r.defaultTimezone}</td>
                <td className="px-5 py-3 text-right tabular-nums">{r._count?.products ?? 0}</td>
                <td className="px-5 py-3"><StatusBadge status={r.enabled ? 'ACTIVE' : 'INACTIVE'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
