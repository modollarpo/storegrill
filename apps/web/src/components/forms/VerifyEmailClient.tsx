'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    let cancelled = false;
    api<{ message: string }>('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(() => {
        if (!cancelled) setState('success');
      })
      .catch(err => {
        if (cancelled) return;
        setState('error');
        setMessage(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" aria-label="Storegrill home" className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Storegrill" className="h-9 w-auto" />
      </Link>
      <div className="w-full max-w-[460px] card p-6 md:p-8 shadow-sm text-center" data-testid="verify-email-card">
        {state === 'pending' && (
          <>
            <h1 className="text-displaysm font-semibold text-charcoal">Verifying your email…</h1>
            <p className="text-sm text-smoke-600 mt-2">This will only take a moment.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <h1 className="text-displaysm font-semibold text-charcoal">Email verified</h1>
            <p className="text-sm text-smoke-600 mt-2">Your email address is confirmed. You now have full access to your account.</p>
            <Link href="/account" className="btn btn-primary w-full justify-center mt-6">Go to your account</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 className="text-displaysm font-semibold text-charcoal">Verification failed</h1>
            <p className="text-sm text-smoke-600 mt-2">{message}</p>
            <Link href="/auth/signin" className="btn btn-outline w-full justify-center mt-6">Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
