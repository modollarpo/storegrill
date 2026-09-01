'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast } from '../feedback/Toast';

export interface AuthCardProps {
  mode: 'signin' | 'signup' | 'forgot' | 'reset';
}

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Continue with Google',
  facebook: 'Continue with Facebook',
  linkedin: 'Continue with LinkedIn',
};

const PROVIDER_STYLES: Record<string, string> = {
  google: 'bg-white border-smoke-200 text-charcoal hover:bg-smoke-50 hover:border-smoke-300',
  facebook: 'bg-[#1877F2] border-[#1877F2] text-white hover:bg-[#166FE5]',
  linkedin: 'bg-[#0A66C2] border-[#0A66C2] text-white hover:bg-[#0958A8]',
};

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'google') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.97 11.97 0 0 0 0 10.76l3.98-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
      </svg>
    );
  }
  if (provider === 'facebook') {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export function AuthCard({ mode }: AuthCardProps) {
  const [providers, setProviders] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  useEffect(() => {
    api<{ providers: string[] }>('/api/v1/auth/oauth/providers')
      .then(data => setProviders(data.providers))
      .catch(() => setProviders([]));
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="Storegrill home" className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Storegrill" className="h-9 w-auto" />
      </Link>
      {providers.length > 0 && (
        <>
          <div className="flex flex-col gap-3 mb-4 w-full max-w-[460px]" role="group" aria-label="Continue with">
            {providers.map(p => (
              <a
                key={p}
                href={`${API_BASE}/api/v1/auth/oauth/${p}/start?sg_oauth_next=${encodeURIComponent(nextPath)}`}
                aria-label={PROVIDER_LABELS[p] || `Continue with ${p}`}
                className={cn(
                  'flex items-center justify-center gap-3 h-12 w-full rounded-lg border text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-[0.98]',
                  PROVIDER_STYLES[p] || 'bg-surface border-border text-text-primary hover:bg-surface-sunken'
                )}
              >
                <ProviderIcon provider={p} />
                {PROVIDER_LABELS[p] || p}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 mb-4 w-full max-w-[460px]" aria-hidden="true">
            <span className="h-px bg-smoke-200 flex-1" />
            <span className="text-2xs text-smoke-400 uppercase tracking-wide">or</span>
            <span className="h-px bg-smoke-200 flex-1" />
          </div>
        </>
      )}
      <div className="w-full max-w-[460px] card p-6 md:p-8 shadow-sm">
        <AuthForm mode={mode} />
      </div>
      <p className="text-xs text-smoke-500 mt-6 max-w-sm text-center leading-relaxed">
        By continuing you agree to{' '}
        <a href="/terms" className="font-medium hover:text-tealink underline underline-offset-2">Conditions of Use</a>
        {' '}and{' '}
        <a href="/privacy" className="font-medium hover:text-tealink underline underline-offset-2">Privacy Notice</a>.
      </p>
    </div>
  );
}

function AuthForm({ mode }: { mode: AuthCardProps['mode'] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setNotice('');

    try {
      if (mode === 'signin') {
        await api('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        toast({ variant: 'success', title: 'Welcome back', description: 'You are signed in.' });
        router.push(nextPath);
      } else if (mode === 'signup') {
        await api('/api/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        toast({ variant: 'success', title: 'Account created', description: 'Check your inbox to verify your email address.' });
        router.push(nextPath);
      } else if (mode === 'forgot') {
        await api('/api/v1/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setNotice(`If an account exists for ${email}, a reset link is on its way.`);
      } else {
        const token = searchParams.get('token') || '';
        await api('/api/v1/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ password, token }),
        });
        toast({ variant: 'success', title: 'Password updated', description: 'Sign in with your new password.' });
        router.push('/auth/signin');
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      setFormError(message);
      toast({ variant: 'error', title: 'Error', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
      <h1 className="text-displaysm font-semibold text-charcoal">
        {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Set new password'}
      </h1>
      {mode === 'signup' && (
        <div>
          <label htmlFor="auth-name" className="block text-xs font-semibold mb-1.5">Your name</label>
          <input
            id="auth-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="input"
            placeholder="First and last name"
          />
        </div>
      )}
      {mode !== 'reset' && (
        <div>
          <label htmlFor="auth-email" className="block text-xs font-semibold mb-1.5">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            inputMode="email"
            className="input"
          />
        </div>
      )}
      {mode !== 'forgot' && (
        <div>
          <label htmlFor="auth-password" className="block text-xs font-semibold mb-1.5">
            {mode === 'reset' ? 'New password' : 'Password'}
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === 'signup' || mode === 'reset' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input"
            aria-describedby={mode === 'signup' ? 'pw-hint' : undefined}
          />
          {(mode === 'signup' || mode === 'reset') && (
            <span id="pw-hint" className="text-2xs text-smoke-400 mt-1 block">
              Minimum 8 characters.
            </span>
          )}
        </div>
      )}
      {(mode === 'signin' || mode === 'signup') && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember-me"
            checked={remember}
            onChange={() => setRemember(r => !r)}
            className="w-[18px] h-[18px] accent-[var(--color-ember)] cursor-pointer"
          />
          <label htmlFor="remember-me" className="text-xs text-smoke-500 cursor-pointer">
            Keep me signed in
          </label>
        </div>
      )}
      {formError && (
        <p role="alert" className="text-xs text-feedback-danger">{formError}</p>
      )}
      {notice && (
        <p role="status" className="text-xs text-tealink">{notice}</p>
      )}
      <button type="submit" disabled={submitting} className="btn btn-primary w-full">
        {submitting
          ? 'Please wait...'
          : mode === 'signin'
            ? 'Sign in'
            : mode === 'signup'
              ? 'Create account'
              : mode === 'forgot'
                ? 'Send reset link'
                : 'Update password'}
      </button>
      <p className="text-xs text-smoke-500 text-center">
        {mode === 'signin' ? (
          <>
            New to Storegrill?{' '}
            <Link href="/auth/signup" className="font-medium hover:text-tealink hover:underline">Create account</Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium hover:text-tealink hover:underline">Sign in</Link>
          </>
        )}
      </p>
      {mode === 'signin' && (
        <p className="text-xs text-smoke-500 text-center">
          <Link href="/auth/forgot-password" className="hover:text-tealink hover:underline">Forgot your password?</Link>
        </p>
      )}
    </form>
  );
}
