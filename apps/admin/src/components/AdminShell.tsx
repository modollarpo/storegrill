'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Dashboard', href: '/', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { label: 'Orders', href: '/orders', icon: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z' },
  { label: 'Analytics', href: '/analytics', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { label: 'Feeds', href: '/feeds', icon: 'M15 17h5v-2.4c0-1.44-.96-2.6-2.2-2.85M15 17h-3.5m3.5 0v-5a5 5 0 00-2-4M6 21v-2a4 4 0 014-4h2m-6 6H2m6-16a4 4 0 014 4m-4-4v4m8 0a4.5 4.5 0 014.5 4.5V14' },
  { label: 'Creative Studio', href: '/creative-studio', icon: 'M3.17 5L3 6.66l1.06 2.28a4.5 4.5 0 010 2.54L3 13.77l9.4 5.4a1.75 1.75 0 001.74 0l6.27-3.6a1.75 1.75 0 010-3.03l.87-.5V6.14a1.75 1.75 0 00-1.74-1.77H3.17zM20.5 10.5l-5.25 3a1.5 1.5 0 01-2.28 1.21l-6.02-3.5a1.5 1.5 0 010-2.55l6.02-3.51a1.5 1.5 0 012.28 1.2l5.25 3z' },
  { label: 'Products', href: '/products', icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.41l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.41zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z' },
  { label: 'Vendors', href: '/vendors', icon: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z' },
  { label: 'Reviews', href: '/reviews', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
  { label: 'Imports', href: '/imports', icon: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z' },
  { label: 'Deals', href: '/deals', icon: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z' },
  { label: 'Coupons', href: '/coupons', icon: 'M20 12c0-1.1.9-2 2-2V4H2v6c1.1 0 2 .9 2 2s-.9 2-2 2v6h20v-6c-1.1 0-2-.9-2-2zm-8-3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm-8 1c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm16 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z' },
  { label: 'Payouts', href: '/payouts', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 6h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Regions', href: '/regions', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  { label: 'Audit Logs', href: '/audit-logs', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.06 16.66l-3.6-3.6 1.41-1.41 2.19 2.19 4.6-4.6 1.41 1.41-6.01 6.01z' },
  { label: 'Content', href: '/content', icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
  { label: 'Settings', href: '/settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
] as const;

function getEnvironment(): { label: string; isProd: boolean } {
  if (typeof window === 'undefined') return { label: '…', isProd: false };
  const host = window.location.hostname;
  if (host === 'localhost' || host.endsWith('.local')) return { label: 'Local', isProd: false };
  const region = host.split('-')[0];
  return { label: `${region.toUpperCase()} Pod`, isProd: true };
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [env, setEnv] = useState(() => getEnvironment());

  useEffect(() => {
    setEnv(getEnvironment());
    api<{ user: { name: string; email: string; role: string } }>('/api/v1/auth/me')
      .then(res => {
        if (res.user.role !== 'ADMIN') {
          router.replace('/login?denied=1');
          return;
        }
        setUser(res.user);
        setChecking(false);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  const current = NAV.find(n => (n.href === '/' ? pathname === '/' : pathname.startsWith(n.href)));

  async function signOut() {
    try { await api('/api/v1/auth/logout', { method: 'POST' }); } catch (e) { if (!(e instanceof ApiError)) throw e; }
    router.replace('/login');
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-4 border-surface-200 border-t-brand-500 animate-spin" />
          <p className="text-sm font-medium text-surface-500" aria-busy="true">Authenticating session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100/60 flex">
      <aside className="w-64 shrink-0 bg-gradient-to-b from-surface-950 to-surface-900 text-surface-300 flex flex-col sticky top-0 h-screen z-40" aria-label="Admin navigation">
        <div className="px-6 py-5 border-b border-surface-800/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-950/40">
            S
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">StoreGrill</p>
            <p className="text-[10px] uppercase tracking-widest text-brand-400 font-bold mt-0.5">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ label, href, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all border border-transparent',
                  active
                    ? 'bg-brand-500/15 text-brand-300 border-brand-500/20 border-l-2 border-l-brand-400'
                    : 'text-surface-400 hover:bg-surface-800/60 hover:text-white',
                )}
              >
                <svg className={cn('w-[18px] h-[18px] transition-colors shrink-0', active ? 'text-brand-400' : 'text-surface-500')} viewBox="0 0 24 24" fill="currentColor">
                  <path d={icon} />
                </svg>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-surface-800/60 p-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-800/40 border border-surface-800/40">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {user?.name.charAt(0) ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-surface-400 truncate">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="p-1.5 text-surface-500 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-surface-200 px-8 py-3 flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold text-surface-900 tracking-tight leading-tight">{current?.label ?? 'Admin'}</h1>
            <p className="text-[11px] text-surface-500 font-medium leading-tight mt-0.5">
              StoreGrill Admin · <span className="tabular-nums">{env.label}</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-surface-200 bg-surface-50 rounded-md px-2 py-1 text-surface-600">
              <span className={env.isProd ? 'w-1.5 h-1.5 rounded-full bg-emerald-500' : 'w-1.5 h-1.5 rounded-full bg-amber-500'} />
              {env.label}
            </span>
          </div>
        </header>

        <main className="flex-1 p-8 lg:px-10 lg:py-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-surface-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-surface-500 mt-1 font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export { StatusBadge } from '@/components/ui/Badge';