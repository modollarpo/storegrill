'use client';

import Link from 'next/link';

export default function VendorPortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[50vh] grid place-items-center px-4">
      <div className="text-center max-w-md">
        <p className="text-4xl" aria-hidden="true">🛠️</p>
        <h1 className="mt-4 text-lg font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500">
          The page failed to load{error.digest ? ` (ref: ${error.digest})` : ''}. Your data is safe — retry or head back to the dashboard.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={reset} className="h-9 px-4 rounded-md bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors">
            Retry
          </button>
          <Link href="/" className="h-9 inline-flex items-center px-4 rounded-md border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
