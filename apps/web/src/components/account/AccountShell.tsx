'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { REGION_META, DEFAULT_REGION_KEY } from '@/lib/regions';
import { useToast } from '../feedback/Toast';

const EXTRA_FLAGS: Record<string, string> = { EU: '🇪🇺' };

function flagForKey(key: string): string {
  return EXTRA_FLAGS[key] ?? REGION_META.find(r => r.key === key)?.flag ?? '🌍';
}

interface RegionOption {
  key: string;
  name: string;
  flag: string;
}

const TABS = [
  ['Overview', '/account'],
  ['Orders', '/account/orders'],
  ['Wishlist', '/account/wishlist'],
  ['Addresses', '/account/addresses'],
  ['Profile', '/account/profile'],
  ['Preferences', '/account/preferences'],
] as const;

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);
  const [preferredRegionKey, setPreferredRegionKey] = useState<string | null>(null);
  const [savingRegion, setSavingRegion] = useState<string | null>(null);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);

  useEffect(() => {
    api<{ regions: Array<{ key: string; name: string }> }>('/api/v1/regions')
      .then(d => setRegionOptions(d.regions.map(r => ({ key: r.key, name: r.name, flag: flagForKey(r.key) }))))
      .catch(() => undefined);
    api<{ user?: { emailVerified?: boolean; customerProfile?: { preferredRegionKey?: string | null } } }>('/api/v1/auth/me')
      .then(data => {
        setEmailVerified(Boolean(data.user?.emailVerified));
        setPreferredRegionKey(data.user?.customerProfile?.preferredRegionKey ?? null);
      })
      .catch(() => router.replace('/auth/signin?next=' + encodeURIComponent(pathname)));
  }, [pathname, router]);

  async function chooseRegion(key: string) {
    if (key === preferredRegionKey || savingRegion) return;
    setSavingRegion(key);
    try {
      await api('/api/v1/auth/preferences', { method: 'PUT', body: JSON.stringify({ preferredRegionKey: key }) });
      setPreferredRegionKey(key);
      toast({ variant: 'success', title: 'Preference saved', description: `Your shipping region is now ${regionOptions.find(r => r.key === key)?.name ?? key}.` });
    } catch (err) {
      toast({ variant: 'error', title: 'Error', description: err instanceof ApiError ? err.message : 'Could not save the region.' });
    } finally {
      setSavingRegion(null);
    }
  }

  async function resendVerification() {
    setResending(true);
    try {
      await api('/api/v1/auth/resend-verification', { method: 'POST' });
      toast({ variant: 'success', title: 'Email sent', description: 'Check your inbox for the verification link.' });
    } catch (err) {
      toast({ variant: 'error', title: 'Error', description: err instanceof ApiError ? err.message : 'Could not resend the email.' });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="container-site py-6">
      <h1 className="text-displaymd font-semibold text-charcoal mb-5">Your Account</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[var(--grid-smoke-220)_1fr] gap-6 items-start">
        <nav aria-label="Account sections" className="card overflow-hidden lg:sticky lg:top-32">
          <ul role="list">
            {TABS.map(([label, href]) => {
              const active = pathname === href || (href !== '/account' && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block px-4 py-3 text-xs font-medium border-l-2 transition-colors',
                      active ? 'border-ember bg-ember-pale text-charcoal' : 'border-transparent text-smoke-600 hover:bg-smoke-50 hover:text-charcoal'
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div>
          {emailVerified === false && (
            <div role="alert" className="mb-4 rounded-md border border-ember/40 bg-ember-pale px-4 py-3 flex flex-wrap items-center gap-3" data-testid="verify-banner">
              <span className="text-sm text-charcoal grow">
                <strong className="font-semibold">Verify your email.</strong>{' '}
                <span className="text-smoke-600">Check your inbox — checkout and reviews stay locked until your address is confirmed.</span>
              </span>
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="btn btn-outline btn-sm shrink-0"
              >
                {resending ? 'Sending…' : 'Resend email'}
              </button>
            </div>
          )}
          {emailVerified === true && (
            <section aria-label="Shipping region" className="mb-4 card px-4 py-3" data-testid="region-card">
              <p className="text-sm font-semibold text-charcoal mb-2">Preferred shipping region</p>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {regionOptions.map(r => {
                  const active = (preferredRegionKey ?? DEFAULT_REGION_KEY) === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={savingRegion !== null}
                      onClick={() => chooseRegion(r.key)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
                        active ? 'border-ember bg-ember-pale text-charcoal' : 'border-smoke-200 text-smoke-600 hover:bg-smoke-50'
                      )}
                    >
                      <span aria-hidden="true" className="mr-1">{r.flag}</span>{r.name}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
