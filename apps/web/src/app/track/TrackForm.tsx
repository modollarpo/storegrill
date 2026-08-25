'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TrackForm() {
  const router = useRouter();
  const [orderNo, setOrderNo] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const v = orderNo.trim().toUpperCase();
        if (!/^SG-[A-Z0-9]{4,10}$/.test(v)) {
          setError('Order numbers look like SG-XXXXXX — check your confirmation email.');
          return;
        }
        setError(null);
        router.push(`/account/orders?q=${encodeURIComponent(v)}`);
      }}
      className="card p-6 max-w-xl"
      aria-labelledby="track-heading"
    >
      <h2 id="track-heading" className="text-sm font-bold text-charcoal">Track a parcel</h2>
      <label htmlFor="track-order" className="block text-xs font-semibold text-smoke-600 mt-3 mb-1">
        Order number
      </label>
      <input
        id="track-order"
        value={orderNo}
        onChange={e => setOrderNo(e.target.value)}
        placeholder="SG-XXXXXX"
        autoComplete="off"
        className="input w-full h-10 font-mono"
      />
      {error && <p className="text-xs text-feedback-danger font-semibold mt-2" role="alert">{error}</p>}
      <p className="text-xs text-smoke-500 mt-3 leading-relaxed">
        Signed in? We will take you straight to the order. Not signed in? You will be asked to verify your email first.
      </p>
      <button type="submit" className="btn btn-primary btn-md rounded-full px-8 mt-4">Track order</button>
    </form>
  );
}
