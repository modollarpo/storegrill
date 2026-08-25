'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CONSENT_COOKIE, readConsent } from '@/lib/consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readConsent());
    function onChange() {
      setVisible(!readConsent());
    }
    window.addEventListener('storegrill:consent-changed', onChange);
    return () => window.removeEventListener('storegrill:consent-changed', onChange);
  }, []);

  function quickSave(all: boolean) {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
      JSON.stringify({ necessary: true, analytics: all, marketing: all, ts: Date.now() })
    )}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event('storegrill:consent-changed'));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-[var(--z-modal)] border-t border-border-strong bg-white shadow-[0_-4px_20px_rgba(31,48,57,0.14)]" aria-label="Cookie consent" data-testid="cookie-banner">
      <div className="container-site py-4 md:flex md:items-center md:gap-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-charcoal">Cookies on Storegrill</h2>
          <p className="mt-1 max-w-3xl text-sm text-smoke-600">
            We use essential cookies to keep your basket, region and account working. Optional cookies help us and our
            partners personalise offers and measure how the shop is used — you choose which ones.
            {' '}<Link href="/cookies" className="font-semibold text-ember underline underline-offset-2">Read the details</Link>.
          </p>
        </div>
        <div className="mt-4 flex shrink-0 flex-wrap gap-2 md:mt-0 md:justify-end">
          <Link href="/cookies" className="btn btn-outline btn-sm">Cookie settings</Link>
          <button type="button" onClick={() => quickSave(false)} className="btn btn-outline btn-sm" data-testid="reject-cookies">Reject optional</button>
          <button type="button" onClick={() => quickSave(true)} className="btn btn-primary btn-sm" data-testid="accept-cookies">Accept all</button>
        </div>
      </div>
    </aside>
  );
}
