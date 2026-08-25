import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';

export const metadata: Metadata = { title: 'Your Addresses', robots: { index: false } };

const ADDRESSES = [
  { id: '1', label: 'Home', street: '123 Main St', city: 'New York', state: 'NY', zip: '10001', country: 'US', isDefault: true },
];

export default function AddressesPage() {
  return (
    <AccountShell>
      <h2 className="text-displaysm font-semibold mb-4">Your Addresses</h2>
      <ul className="grid sm:grid-cols-2 gap-4" role="list">
        {ADDRESSES.map(a => (
          <li key={a.id} className="card p-5">
            <p className="text-xs font-bold text-charcoal">{a.label}</p>
            <p className="text-xs text-smoke-600 mt-1.5 leading-relaxed">
              {a.street}<br />{a.city}, {a.state} {a.zip}<br />{a.country}
            </p>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-outline btn-sm mt-5">+ Add a new address</button>
    </AccountShell>
  );
}
