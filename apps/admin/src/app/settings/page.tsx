'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';

interface SiteSetting {
  id: string;
  key: string;
  value: unknown;
  group: string;
}

const DEFAULT_KEYS: Array<{ key: string; group: string; label: string; placeholder?: string }> = [
  { key: 'site.name', group: 'general', label: 'Site name', placeholder: 'Storegrill' },
  { key: 'site.tagline', group: 'general', label: 'Tagline', placeholder: 'Shop local, ship global' },
  { key: 'support.email', group: 'contact', label: 'Support email', placeholder: 'support@example.com' },
  { key: 'support.phone', group: 'contact', label: 'Support phone', placeholder: '+1 555 000 0000' },
  { key: 'seo.defaultTitle', group: 'seo', label: 'Default title', placeholder: 'Storegrill — shop the world' },
  { key: 'seo.defaultDescription', group: 'seo', label: 'Default description' },
  { key: 'checkout.minOrderMinorUnits', group: 'checkout', label: 'Min order (minor units)', placeholder: '0' },
];

function SettingsInner() {
  const [settings, setSettings] = useState<SiteSetting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ settings: SiteSetting[] }>('/api/v1/admin/settings')
      .then(d => {
        setSettings(d.settings);
        const next: Record<string, string> = {};
        for (const s of d.settings) {
          next[s.key] = typeof s.value === 'string' ? s.value : s.value == null ? '' : JSON.stringify(s.value);
        }
        setDraft(next);
        setError(null);
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Load failed'));
  }, []);

  useEffect(load, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const entries = DEFAULT_KEYS.map(k => ({
        key: k.key,
        group: k.group,
        value: k.key === 'checkout.minOrderMinorUnits'
          ? Math.max(0, Number(draft[k.key] ?? '') || 0)
          : (draft[k.key] ?? '').trim(),
      }));
      await api('/api/v1/admin/settings', { method: 'PUT', body: JSON.stringify({ settings: entries }) });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-surface-raised';
  const groups = ['general', 'contact', 'seo', 'checkout'];

  return (
    <AdminShell>
      <PageHeader title="Settings" subtitle="Global site configuration" />

      {error && <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}

      {!settings && <div className="bg-surface-raised rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400" aria-busy="true">Loading…</div>}

      {settings && (
        <div className="bg-surface-raised rounded-xl border border-slate-200 p-5">
          {groups.map(group => (
            <div key={group} className={group !== groups[groups.length - 1] ? 'border-b border-slate-100 pb-5 mb-5' : ''}>
              <h2 className="text-sm font-bold text-slate-900 mb-3 capitalize">{group}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DEFAULT_KEYS.filter(k => k.group === group).map(k => (
                  <div key={k.key}>
                    <label htmlFor={`set-${k.key}`} className="block text-xs font-semibold text-slate-600 mb-1">{k.label}</label>
                    <input
                      id={`set-${k.key}`}
                      value={draft[k.key] ?? ''}
                      onChange={e => setDraft({ ...draft, [k.key]: e.target.value })}
                      className={inputClass}
                      placeholder={k.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={busy}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 transition-colors disabled:opacity-50">
              {busy ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

export default function AdminSettingsPage() {
  return <SettingsInner />;
}