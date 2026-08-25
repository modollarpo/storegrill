'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      const me = await api<{ user: { role: string } | null }>('/api/v1/auth/me');
      if (!me.user) {
        setError('Sign-in failed. Try again.');
        return;
      }
      router.replace(params.get('next') || '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-teal-950 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-7">
        <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-amber-600 mb-1">StoreGrill</p>
        <h1 className="text-lg font-bold text-slate-900 mb-5">Seller Portal</h1>
        {params.get('denied') && (
          <p role="alert" className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            That account is not a seller account.
          </p>
        )}
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-slate-700 mb-1">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-10 rounded-md border border-slate-300 px-3 text-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none"
            />
          </label>
          {error && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">⚠ {error}</p>}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full h-10 rounded-md bg-teal-800 text-white text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
