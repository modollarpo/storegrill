'use client';

import { useState, useEffect } from 'react';

const DEFAULT_MESSAGES = [
  'Free delivery on eligible orders',
  'Great deals on top brands — refreshed daily',
  'Spread the cost with flexible payment options',
  'Free collection from your local store in as little as 1 hour',
];

export interface AnnouncementBarProps {
  messages?: string[];
}

export function AnnouncementBar({ messages = DEFAULT_MESSAGES }: AnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = document.cookie.includes('hide_promo=1');
    setDismissed(isDismissed);
  }, []);

  if (dismissed) return null;
  const all = [...messages, ...messages];

  function handleDismiss() {
    document.cookie = 'hide_promo=1; max-age=86400; path=/';
    setDismissed(true);
  }

  return (
    <div className="relative overflow-hidden bg-ember text-white" role="banner">
      <div className="flex items-stretch justify-between h-8">
        <div className="flex-1 flex items-center overflow-hidden">
          <div className="animate-marquee inline-flex w-max whitespace-nowrap" aria-live="off">
            {all.map((msg, i) => (
              <span key={i} className="inline-block text-xs font-semibold px-10">{msg}</span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 w-9 grid place-items-center text-white/70 hover:text-white hover:bg-black/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
