'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEnvironment(): { label: string; isProd: boolean } {
  if (typeof window === 'undefined') return { label: 'Loading environment…', isProd: false };
  const host = window.location.hostname;
  if (host === 'localhost' || host.endsWith('.local')) return { label: 'Local development', isProd: false };
  const region = host.split('-')[0];
  return { label: `Production · ${region.toUpperCase()}`, isProd: true };
}

export default function VendorLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const env = useMemo(getEnvironment, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'rate-limit' | 'general' | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    api<{ user: { role: string } | null }>('/api/v1/auth/me')
      .then(res => {
        if (res.user && ['VENDOR', 'ADMIN'].includes(res.user.role)) {
          router.replace(params.get('next') || '/');
        }
      })
      .catch(() => undefined);
  }, [router, params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    setForgot(null);
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
      const me = await api<{ user: { role: string } | null }>('/api/v1/auth/me');
      if (!me.user || !['VENDOR', 'ADMIN'].includes(me.user.role)) {
        setError('This account does not have seller access. Contact your platform administrator.');
        setErrorType('auth');
        return;
      }
      router.replace(params.get('next') || '/');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError('Too many sign-in attempts. Please wait 15 minutes and try again.');
          setErrorType('rate-limit');
        } else {
          setError(err.message);
          setErrorType('auth');
        }
      } else {
        setError('Unable to reach the platform. Check your connection and try again.');
        setErrorType('general');
      }
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    setError(null);
    setFieldError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError('Enter your account email first.');
      return;
    }
    setForgotLoading(true);
    try {
      await api('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setForgot('If an account exists for that email, a password reset link has been sent.');
    } catch {
      setError('Could not send the reset email. Please try again.');
      setErrorType('general');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-surface-50">
      <aside className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-surface-950 via-surface-900 to-surface-900 text-white p-12">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute top-8 right-8 opacity-[0.04]">
          <svg className="w-72 h-72" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 12.982a1.025 1.025 0 01.353 1.418c-.388.667-.87 1.314-1.39 1.9a.75.75 0 01-1.177.039 9.705 9.705 0 01-1.22-2.038.75.75 0 011.36-.635c.2.426.43.84.688 1.237a27.791 27.791 0 011.386-1.87.75.75 0 011.36.47zm1.314-3.954a.75.75 0 01.975.295 6.761 6.761 0 01.348 1.163.75.75 0 01-1.46.344 5.268 5.268 0 00-.27-.9.75.75 0 01.407-.902zm-1.88-1.44A8.25 8.25 0 1019.5 12a8.25 8.25 0 00-13.951-5.452zm1.514.038A6.75 6.75 0 1112 18.75a6.75 6.75 0 01-7.051-6.214zM5.506 4.123a.75.75 0 011.054-.113 15.09 15.09 0 0119.44 0 .75.75 0 11-.936 1.172 13.59 13.59 0 00-17.517 0 .75.75 0 01-1.04-.02zM20.25 12a8.25 8.25 0 01-2.27 5.8l-1.5 1.5A8.25 8.25 0 013.75 12a8.25 8.25 0 01.657-3.22.75.75 0 011.4.546A6.75 6.75 0 1012 5.25a6.795 6.795 0 01-.008.75.75.75 0 11-1.5-.045c.005-.35.02-.695.043-1.04a8.25 8.25 0 017.237 7.289v.001z" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-900/40">
            S
          </div>
          <div>
            <p className="text-white font-bold text-base tracking-wide">StoreGrill</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-400 font-bold">Seller Portal</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
            Grow your store. Everywhere.
          </h1>
          <p className="text-surface-300 mt-3 text-sm leading-relaxed">
            One seller console to manage orders, catalog, deals and payouts — live in every region.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { title: 'Fulfill in minutes', body: 'See orders the moment they land and ship with a single click.' },
              { title: 'Scale your catalog', body: 'Bulk-import CSV or feeds, then enrich listings with AI.' },
              { title: 'Transparent payouts', body: 'Every settlement is itemised, auditable and on schedule.' },
            ].map(item => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-surface-500 font-medium">
          <svg className="w-4 h-4 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Seller-grade security · Region-scoped data · 24/7 support
        </div>
      </aside>

      <main className="flex flex-col justify-center items-center px-6 py-12 relative">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
              S
            </div>
            <div>
              <p className="text-surface-900 font-bold text-base tracking-wide">StoreGrill</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand-600 font-bold">Seller Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-surface-900 tracking-tight">Sign in to sell</h2>
            <p className="text-sm text-surface-500 font-medium mt-1">Access your seller dashboard.</p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider border border-surface-200 bg-white rounded-md px-2 py-1 text-surface-600 mb-6">
            <span className={env.isProd ? 'w-1.5 h-1.5 rounded-full bg-emerald-500' : 'w-1.5 h-1.5 rounded-full bg-amber-500'} />
            {env.label}
          </span>

          {params.get('denied') && (
            <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 font-medium">
              <span className="font-bold">Access restricted.</span> That account lacks seller permissions.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className={`mb-4 rounded-lg border px-4 py-3 text-xs font-medium flex gap-2.5 ${
                errorType === 'rate-limit'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <svg className={`w-4 h-4 shrink-0 mt-px ${errorType === 'rate-limit' ? 'text-amber-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {fieldError && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              {fieldError}
            </div>
          )}

          {forgot && (
            <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium flex gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-px text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {forgot}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="vp-email" className="block text-[13px] font-semibold text-surface-700 mb-1.5">Email</label>
              <input
                id="vp-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-11 rounded-lg border border-surface-300 bg-white px-3.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-100 transition-colors"
                placeholder="you@store.com"
              />
            </div>

            <div>
              <label htmlFor="vp-password" className="block text-[13px] font-semibold text-surface-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="vp-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 rounded-lg border border-surface-300 bg-white px-3.5 pr-11 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:border-brand-500 focus:ring-brand-100 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3.5 flex items-center text-surface-400 hover:text-surface-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={forgotPassword}
                disabled={forgotLoading}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline disabled:opacity-50"
              >
                {forgotLoading ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full h-11 rounded-lg bg-surface-900 text-white text-sm font-bold hover:bg-surface-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}