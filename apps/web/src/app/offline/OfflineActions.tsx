'use client';

import Link from 'next/link';

export function OfflineActions() {
  return (
    <div className="mt-8 flex items-center gap-4">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn btn-primary px-8 py-3 font-extrabold"
      >
        Try again
      </button>
      <Link href="/" className="text-sm font-bold text-action-primary hover:underline">
        Go to homepage
      </Link>
    </div>
  );
}
