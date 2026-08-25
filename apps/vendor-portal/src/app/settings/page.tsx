'use client';

import { useEffect, useState } from 'react';
import { VendorShell, PageHeader } from '@/components/VendorShell';
import { FormRow, FormSection } from '@/components/ui/FormLayout';
import { Switch } from '@/components/ui/Switch';
import { toastSuccess } from '@/components/ui/Toast';

interface VendorSettings {
  newOrderAlerts: boolean;
  importFailureAlerts: boolean;
  payoutAlerts: boolean;
  weeklyDigest: boolean;
}

const DEFAULTS: VendorSettings = {
  newOrderAlerts: true,
  importFailureAlerts: true,
  payoutAlerts: true,
  weeklyDigest: false,
};

const STORAGE_KEY = 'sg-vendor-settings';

export default function VendorSettingsPage() {
  const [settings, setSettings] = useState<VendorSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // defaults
    }
    setLoaded(true);
  }, []);

  function update<K extends keyof VendorSettings>(key: K, value: boolean) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    toastSuccess('Preference saved');
  }

  return (
    <VendorShell>
      <PageHeader title="Settings" subtitle="Notification preferences for this seller account" />

      <FormSection title="Notifications" description="Delivered by email and the portal notification bell.">
        <div className="py-4 space-y-4">
          <Switch
            label="New order alerts"
            description="Notify me immediately when a customer buys one of my products"
            checked={settings.newOrderAlerts}
            onChange={v => update('newOrderAlerts', v)}
            disabled={!loaded}
          />
          <Switch
            label="Import failure alerts"
            description="Tell me when a bulk import job has failed rows"
            checked={settings.importFailureAlerts}
            onChange={v => update('importFailureAlerts', v)}
            disabled={!loaded}
          />
          <Switch
            label="Payout notifications"
            description="Confirmations when a settlement reaches my account"
            checked={settings.payoutAlerts}
            onChange={v => update('payoutAlerts', v)}
            disabled={!loaded}
          />
          <Switch
            label="Weekly performance digest"
            description="Monday morning summary of sales, stock warnings and top items"
            checked={settings.weeklyDigest}
            onChange={v => update('weeklyDigest', v)}
            disabled={!loaded}
          />
        </div>
      </FormSection>
    </VendorShell>
  );
}
