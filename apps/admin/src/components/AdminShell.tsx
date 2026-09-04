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
  { label: 'Products', href: '/products', icon: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.41l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.41zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z' },
  { label: 'Vendors', href: '/vendors', icon: 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z' },
  { label: 'Reviews', href: '/reviews', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
  { label: 'Imports', href: '/imports', icon: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z' },
  { label: 'Deals', href: '/deals', icon: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z' },
  { label: 'Coupons', href: '/coupons', icon: 'M20 12c0-1.1.9-2 2-2V4H2v6c1.1 0 2 .9 2 2s-.9 2-2 2v6h20v-6c-1.1 0-2-.9-2-2zm-8-3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm-8 1c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm16 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z' },
  { label: 'Payouts', href: '/payouts', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { label: 'Regions', href: '/regions', icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  { label: 'Audit Logs', href: '/audit-logs', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1.06 16.66l-3.6-3.6 1.41-1.41 2.19 2.19 4.6-4.6 1.41 1.41-6.01 6.01z' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
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

  async function signOut() {
    try { await api('/api/v1/auth/logout', { method: 'POST' }); } catch (e) { if (!(e instanceof ApiError)) throw e; }
    router.replace('/login');
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-surface-200 border-t-brand-500 animate-spin" />
          <p className="text-sm font-medium text-surface-500" aria-busy="true">Authenticating session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar - Enterprise Dark Theme */}
      <aside className="w-64 shrink-0 bg-surface-950 text-surface-300 flex flex-col sticky top-0 h-screen" aria-label="Admin navigation">
        <div className="px-6 py-6 border-b border-surface-800/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
            S
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">StoreGrill</p>
            <p className="text-[10px] uppercase tracking-widest text-brand-400 font-bold mt-0.5">Admin Console</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV.map(({ label, href, icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  active 
                    ? 'bg-brand-500/10 text-brand-400' 
                    : 'text-surface-400 hover:bg-surface-800/50 hover:text-white'
                )}
              >
                <svg className={cn("w-5 h-5 transition-colors", active ? "text-brand-400" : "text-surface-500 group-hover:text-surface-300")} viewBox="0 0 24 24" fill="currentColor">
                  <path d={icon} />
                </svg>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-surface-800/50 p-4">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-900/50">
            <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-surface-400 truncate">{user?.email}</p>
            </div>
            <button 
              type="button" 
              onClick={signOut} 
              className="p-1.5 text-surface-500 hover:text-white hover:bg-surface-800 rounded-md transition-colors"
              title="Sign out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-8 lg:px-12 lg:py-10">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-surface-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-surface-500 mt-1 font-medium">{subtitle}</p>}
      </div>
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DELIVERED: 'bg-emerald-100/80 text-emerald-700 border-emerald-200',
    PAID: 'bg-blue-100/80 text-blue-700 border-blue-200',
    SHIPPED: 'bg-indigo-100/80 text-indigo-700 border-indigo-200',
    PROCESSING: 'bg-amber-100/80 text-amber-700 border-amber-200',
    PENDING: 'bg-surface-100 text-surface-700 border-surface-200',
    CANCELLED: 'bg-red-100/80 text-red-700 border-red-200',
    REFUNDED: 'bg-purple-100/80 text-purple-700 border-purple-200',
    ACTIVE: 'bg-emerald-100/80 text-emerald-700 border-emerald-200',
    APPROVED: 'bg-emerald-100/80 text-emerald-700 border-emerald-200',
    SUSPENDED: 'bg-red-100/80 text-red-700 border-red-200',
    REJECTED: 'bg-red-100/80 text-red-700 border-red-200',
    PENDING_REVIEW: 'bg-blue-100/80 text-blue-700 border-blue-200',
  };
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border",
      styles[status] ?? 'bg-surface-100 text-surface-700 border-surface-200'
    )}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
