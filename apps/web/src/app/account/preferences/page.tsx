import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { RegionPreferenceForm } from '@/components/account/RegionPreferenceForm';

export const metadata: Metadata = { title: 'Preferences', robots: { index: false } };

export default function PreferencesPage() {
  return (
    <AccountShell>
      <h2 className="text-displaysm font-semibold mb-4">Preferences</h2>
      <RegionPreferenceForm />
    </AccountShell>
  );
}
