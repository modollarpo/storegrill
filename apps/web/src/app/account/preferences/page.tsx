import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { RegionPreferenceForm } from '@/components/account/RegionPreferenceForm';
import { PushPreferences } from '@/components/account/PushPreferences';

export const metadata: Metadata = { title: 'Preferences | Storegrill', robots: { index: false } };

export default function PreferencesPage() {
  return (
    <AccountShell>
      <h2 className="text-displaysm font-semibold mb-4">Preferences</h2>
      <RegionPreferenceForm />
      <PushPreferences />
    </AccountShell>
  );
}
