'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { AdminShell, PageHeader } from '@/components/AdminShell';
import { Card, Field, Input, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

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

  const groups = ['general', 'contact', 'seo', 'checkout'];

  return (
    <AdminShell>
      <PageHeader title="Settings" subtitle="Global site configuration" />

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {!settings && (
        <Card>
          <div className="space-y-6">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        </Card>
      )}

      {settings && (
        <Card>
          {groups.map((group, gi) => (
            <div key={group} className={cn(gi < groups.length - 1 && 'border-b border-surface-100 pb-6 mb-6')}>
              <h2 className="text-[15px] font-bold text-surface-900 mb-4 capitalize">{group}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DEFAULT_KEYS.filter(k => k.group === group).map(k => (
                  <Field key={k.key} label={k.label}>
                    <Input
                      id={`set-${k.key}`}
                      value={draft[k.key] ?? ''}
                      onChange={e => setDraft({ ...draft, [k.key]: e.target.value })}
                      placeholder={k.placeholder}
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={save} loading={busy}>
              {busy ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}

export default function AdminSettingsPage() {
  return <SettingsInner />;
}