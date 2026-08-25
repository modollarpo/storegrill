import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';

export const metadata: Metadata = { title: 'Profile', robots: { index: false } };

export default function ProfilePage() {
  return (
    <AccountShell>
      <h2 className="text-displaysm font-semibold mb-4">Login & Security</h2>
      <ul className="card divide-y divide-smoke-100" role="list">
        {[
          ['Name', 'Manage your public profile name'],
          ['Email', 'Update the email on your account'],
          ['Password', 'Change your password regularly'],
          ['Two-factor authentication', 'Add an extra layer of security'],
        ].map(([title, body]) => (
          <li key={title} className="px-5 py-4 flex items-center justify-between gap-4">
            <span>
              <span className="block text-xs font-bold text-charcoal">{title}</span>
              <span className="block text-2xs text-smoke-500 mt-0.5">{body}</span>
            </span>
            <button type="button" className="btn btn-outline btn-xs shrink-0">Edit</button>
          </li>
        ))}
      </ul>
    </AccountShell>
  );
}
