'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Toaster } from './ui/Toast';
import { cn } from '@/lib/utils';

const NAV: Array<{ label: string; href: string; icon: string }> = [
  { label: 'Dashboard', href: '/', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75' },
  { label: 'Orders', href: '/orders', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' },
  { label: 'Catalog', href: '/products', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z' },
  { label: 'Bulk Imports', href: '/imports', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
  { label: 'Payouts', href: '/payouts', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z' },
  { label: 'Store Profile', href: '/profile', icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582' },
  { label: 'Settings', href: '/settings', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

const REGIONS = [
  { key: 'UK', currency: 'GBP', flag: '🇬🇧' },
  { key: 'US', currency: 'USD', flag: '🇺🇸' },
  { key: 'DE', currency: 'EUR', flag: '🇩🇪' },
  { key: 'FR', currency: 'EUR', flag: '🇫🇷' },
  { key: 'JP', currency: 'JPY', flag: '🇯🇵' },
];

export function VendorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [applicantMode, setApplicantMode] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [region, setRegion] = useState('UK');
  const [notifications, setNotifications] = useState<Array<{ id: string; text: string; kind: string }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ user: { name: string; email: string; role: string } }>('/api/v1/auth/me')
      .then(async res => {
        if (res.user.role === 'VENDOR' || res.user.role === 'ADMIN') {
          setUser(res.user);
          setChecking(false);
          return;
        }
        try {
          const app = await api<{ application: unknown }>('/api/v1/vendors/application');
          if (app.application) {
            setUser(res.user);
            setApplicantMode(true);
            setChecking(false);
            return;
          }
        } catch {
          // fall through to denial
        }
        router.replace('/login?denied=1');
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    api<{ dashboard: { pendingShipments?: number; failedImports?: number; recentOrders?: Array<{ id: string; order?: { orderNumber: string } }> } }>('/api/v1/vendors/me/dashboard')
      .then(d => {
        const notes: Array<{ id: string; text: string; kind: string }> = [];
        if ((d.dashboard.pendingShipments ?? 0) > 0) notes.push({ id: 'ship', text: `${d.dashboard.pendingShipments} orders require shipping`, kind: 'warn' });
        if ((d.dashboard.failedImports ?? 0) > 0) notes.push({ id: 'import', text: `${d.dashboard.failedImports} import job failed`, kind: 'error' });
        setNotifications(notes);
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowNotifications(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function signOut() {
    try { await api('/api/v1/auth/logout', { method: 'POST' }); } catch (e) { if (!(e instanceof ApiError)) throw e; }
    router.replace('/login');
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/orders?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-surface-200 border-t-brand-500 animate-spin" />
          <p className="text-sm font-medium text-surface-500" aria-busy="true">Loading Seller Portal…</p>
        </div>
      </div>
    );
  }

  if (applicantMode) {
    return (
      <div className="min-h-screen bg-surface-50">
        <header className="bg-surface-raised border-b border-surface-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-extrabold">S</div>
            <div>
              <span className="text-sm font-extrabold text-surface-900 leading-none block">StoreGrill</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400 block mt-0.5">Seller Portal</span>
            </div>
          </Link>
          <button type="button" onClick={signOut} className="rounded-md border border-surface-200 text-surface-600 text-xs font-semibold px-3 py-1.5 hover:bg-surface-100">
            Sign out
          </button>
        </header>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'w-[250px] shrink-0 bg-surface-raised border-r border-surface-200 flex flex-col sticky top-0 h-screen',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:top-0 max-lg:h-full max-lg:z-50 max-lg:shadow-2xl max-lg:transition-transform',
          mobileNavOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'
        )}
        aria-label="Portal navigation"
      >
        <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 font-extrabold group-hover:bg-brand-100 transition-colors">
              S
            </div>
            <div>
              <span className="text-sm font-extrabold text-surface-900 leading-none block">StoreGrill</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-surface-400 block mt-0.5">Seller Portal</span>
            </div>
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 text-surface-400 hover:bg-surface-100 rounded-md"
            onClick={() => setMobileNavOpen(false)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          {NAV.map(item => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                )}
              >
                <svg className={cn('w-4.5 h-4.5 shrink-0 transition-colors', active ? 'text-brand-600' : 'text-surface-400 group-hover:text-surface-500')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-surface-100">
          <div className="rounded-xl bg-gradient-to-br from-surface-900 to-surface-950 p-4 shadow-md text-white relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-surface-raised/10 rounded-full blur-xl group-hover:bg-brand-400/20 transition-colors" />
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-400 mb-1">Global Reach</p>
            <p className="text-xs text-white/90 font-medium leading-relaxed">Your products are automatically live across all regions.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 h-16 bg-surface-raised/80 backdrop-blur-md border-b border-surface-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 text-surface-500 hover:bg-surface-100 rounded-md"
              onClick={() => setMobileNavOpen(true)}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <form onSubmit={submitSearch} role="search" className="flex-1 max-w-md hidden sm:block">
              <div className="relative group">
                <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-brand-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search orders, SKUs…"
                  className="w-full h-10 rounded-full bg-surface-100/50 border border-transparent pl-10 pr-4 text-sm font-medium placeholder:text-surface-400 focus:bg-surface-raised focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                />
              </div>
            </form>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <label className="hidden md:flex items-center gap-1.5 shrink-0 bg-surface-50 border border-surface-200 rounded-md px-2 py-1.5">
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="bg-transparent text-xs font-bold text-surface-700 cursor-pointer outline-none border-none pr-1"
              >
                {REGIONS.map(r => (
                  <option key={r.key} value={r.key}>{r.flag} {r.currency}</option>
                ))}
              </select>
            </label>

            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(s => !s)}
                className="relative p-2 rounded-full hover:bg-surface-100 text-surface-500 hover:text-surface-900 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface-raised rounded-xl shadow-lg border border-surface-200 overflow-hidden animate-in z-50">
                  <p className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-surface-500 border-b border-surface-100 bg-surface-50">Alerts</p>
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm font-medium text-surface-400">All caught up.</p>
                  ) : (
                    <ul className="divide-y divide-surface-100">
                      {notifications.map(n => (
                         <li key={n.id} className="p-4 text-sm font-medium flex items-start gap-3 hover:bg-surface-50 transition-colors cursor-default">
                          <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.kind === 'error' ? 'bg-red-500' : 'bg-amber-500')} />
                          <span className="text-surface-700">{n.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="relative group shrink-0 ml-2 border-l border-surface-200 pl-4">
              <button className="flex items-center gap-2.5 outline-none">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-surface-800 to-surface-900 text-white flex items-center justify-center text-[11px] font-bold shadow-sm">
                  {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
                </div>
              </button>
              <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
                <div className="w-56 bg-surface-raised rounded-xl shadow-lg border border-surface-200 p-2 animate-in">
                  <div className="px-3 py-2 border-b border-surface-100 mb-2">
                    <p className="text-sm font-bold text-surface-900 truncate">{user?.name}</p>
                    <p className="text-xs text-surface-500 truncate">{user?.email}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100 rounded-md transition-colors">Store Profile</Link>
                  <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-surface-700 hover:bg-surface-100 rounded-md transition-colors">Settings</Link>
                  <button onClick={signOut} className="w-full text-left flex items-center gap-2 px-3 py-2 mt-1 text-sm font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors">Sign out</button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-6 lg:p-10">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
        
        {mobileNavOpen && (
          <div className="max-lg:fixed inset-0 z-40 bg-surface-900/40 backdrop-blur-sm lg:hidden animate-in" onClick={() => setMobileNavOpen(false)} />
        )}
      </div>
      <Toaster />
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm font-medium text-surface-500 mt-1">{subtitle}</p>}
    </header>
  );
}