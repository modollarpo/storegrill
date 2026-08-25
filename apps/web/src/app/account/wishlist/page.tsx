import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } };

export default function WishlistPage() {
  return (
    <AccountShell>
      <h2 className="text-displaysm font-semibold mb-4">Your Wishlist</h2>
      <div className="card p-10 text-center text-sm text-smoke-500">Items you save while shopping will appear here.</div>
    </AccountShell>
  );
}
