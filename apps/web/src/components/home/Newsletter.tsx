'use client';

import { useState } from 'react';

export function Newsletter() {
  const [email, setEmail] = useState<string>('');
  const [subscribed, setSubscribed] = useState<boolean>(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubscribed(true);
    setEmail('');
  }

  return (
    <>
      <h3 className="text-[14px] font-bold mb-4 text-white">Sign Up For News</h3>
      {subscribed ? (
        <p role="status" className="text-sm font-semibold text-white bg-surface-raised/15 rounded-md px-4 py-3">
          You&apos;re signed up — look out for great deals in your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex">
          <label htmlFor="footer-email" className="sr-only">Email address</label>
          <input
            id="footer-email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email Address"
            className="flex-1 min-w-0 h-[46px] px-4 rounded-l-md border-none bg-surface-raised text-text-primary text-sm outline-none placeholder:text-text-tertiary"
          />
          <button
            type="submit"
            className="shrink-0 h-[46px] px-5 rounded-r-md border-none bg-secondary text-white text-sm font-bold cursor-pointer hover:bg-secondary-hover transition-colors"
          >
            Subscribe
          </button>
        </form>
      )}
    </>
  );
}
