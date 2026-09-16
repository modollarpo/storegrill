'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Field } from '@/components/ui/Form';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEnvironment(): { label: string; region: string | null; isProd: boolean } {
  if (typeof window === 'undefined') return { label: 'Loading environment…', region: null, isProd: false };
  const host = window.location.hostname;
  if (host === 'localhost' || host.endsWith('.local')) {
    return { label: 'Local development', region: null, isProd: false };
  }
  const region = host.split('-')[0];
  return { label: `Production · ${region.toUpperCase()} region`, region, isProd: true };
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
    api<{ user: { role: string } }>('/api/v1/auth/me')
      .then(res => {
        if (res.user.role === 'ADMIN') {
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
      const me = await api<{ user: { role: string } }>('/api/v1/auth/me');
      if (me.user.role !== 'ADMIN') {
        setError('This account does not have admin access. Contact your platform administrator.');
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.17 5L3 6.66l1.06 2.28a4.5 4.5 0 010 2.54L3 13.77l9.4 5.4a1.75 1.75 0 001.74 0l6.27-3.6a1.75 1.75 0 010-3.03l.87-.5V6.14a1.75 1.75 0 00-1.74-1.77H3.17zM20.5 10.5l-5.25 3a1.5 1.5 0 01-2.28 1.21l-6.02-3.5a1.5 1.5 0 010-2.55l6.02-3.51a1.5 1.5 0 012.28 1.2l5.25 3z" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-900/40">
            S
          </div>
          <div>
            <p className="text-white font-bold text-base tracking-wide">StoreGrill</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-400 font-bold">Commerce Platform</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
            Command your marketplace.
          </h1>
          <p className="text-surface-300 mt-3 text-sm leading-relaxed">
            One secure console to run orders, products, vendors and creative across every region.
          </p>

          <ul className="mt-8 space-y-3.5">
            {[
              { title: 'Admin-only access', body: 'Every session is checked against the ADMIN role before anything loads.' },
              { title: 'Full audit trail', body: 'Every publish, approval and status change is recorded and reviewable.' },
              { title: 'Encrypted in transit', body: 'Traffic is TLS-protected end to end on the storegrill.net domain.' },
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
          SOC-style protections · Role gate · Region-scoped data
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
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand-600 font-bold">Admin Console</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-surface-900 tracking-tight">Welcome back</h2>
            <p className="text-sm text-surface-500 font-medium mt-1">Sign in to continue to the admin console.</p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider border border-surface-200 bg-white rounded-md px-2 py-1 text-surface-600 mb-6">
            <span className={env.isProd ? 'w-1.5 h-1.5 rounded-full bg-emerald-500' : 'w-1.5 h-1.5 rounded-full bg-amber-500'} />
            {env.label}
          </span>

          {params.get('denied') && (
            <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 font-medium">
              <span className="font-bold">Access restricted.</span> That account lacks admin permissions.
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 rounded-lg border px-4 py-3 text-xs font-medium flex gap-2.5 bg-red-50 border-red-200 text-red-800">
              <svg className="w-4 h-4 shrink-0 mt-px text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {forgot && (
            <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 font-medium flex gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-px text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {forgot}
            </div>
          )}

          <form onSubmit={submit} className="space-y-5" noValidate>
            <Field label="Email address" required error={fieldError}>
              <Input
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@storegrill.net"
                value={email}
                error={!!fieldError}
                onChange={e => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-surface-400 font-medium">By continuing you agree to be held to the platform admin policy.</span>
              <button
                type="button"
                disabled={forgotLoading}
                onClick={forgotPassword}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
              >
                {forgotLoading ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {loading ? 'Signing in…' : 'Sign in to console'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-200 flex items-center justify-between text-[11px] text-surface-400 font-medium">
            <span>© {new Date().getFullYear()} StoreGrill Commerce</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
              Audit logged
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}