import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { getRequestContext } from '@/lib/server-context';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Your Account', robots: { index: false, follow: false } };
}

const SHORTCUTS = [
  ['Your Orders', 'Track, return or buy things again', '/account/orders'],
  ['Wishlist', 'Products you saved for later', '/account/wishlist'],
  ['Addresses', 'Manage your delivery addresses', '/account/addresses'],
  ['Preferences', 'Region, language and notifications', '/account/preferences'],
];

export default async function AccountPage() {
  await getRequestContext();
  return (
    <AccountShell>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="list">
        {SHORTCUTS.map(([title, body, href]) => (
          <li key={href}>
            <a href={href} className="card p-5 flex items-start gap-4 hover:shadow-card-hover transition-shadow h-full">
              <span aria-hidden="true" className="w-10 h-10 rounded-lg bg-smoke-100 grid place-items-center text-lg shrink-0">
                {{'/account/orders':'📦','/account/wishlist':'♥','/account/addresses':'📍','/account/preferences':'⚙️'}[href] ?? '•'}
              </span>
              <span>
                <span className="block text-sm font-semibold text-charcoal">{title}</span>
                <span className="block text-xs text-smoke-500 mt-0.5">{body}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </AccountShell>
  );
}
