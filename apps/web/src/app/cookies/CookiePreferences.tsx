'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_CONSENT, readConsent, writeConsent, type CookieConsent } from '@/lib/consent';

interface Category {
  id: 'analytics' | 'marketing';
  name: string;
  description: string;
  examples: string[];
}

const CATEGORIES: Category[] = [
  {
    id: 'analytics',
    name: 'Analytics cookies',
    description: 'Help us understand how shoppers move through the store — which searches find nothing, where checkout stalls — so we can fix it.',
    examples: ['Page-view counts', 'Search terms', 'Checkout drop-off points'],
  },
  {
    id: 'marketing',
    name: 'Marketing cookies',
    description: 'Let our partners show you Storegrill products you were looking at, instead of random ads, when you visit other sites.',
    examples: ['Ad relevance', 'Frequency capping', 'Campaign attribution'],
  },
];

export function CookiePreferences() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    setConsent(existing);
    if (existing) {
      setDraft({ analytics: existing.analytics, marketing: existing.marketing });
    } else {
      setDraft({ analytics: DEFAULT_CONSENT.analytics, marketing: DEFAULT_CONSENT.marketing });
    }
  }, []);

  function save(next: { analytics: boolean; marketing: boolean }) {
    const full = writeConsent(next);
    setConsent(full);
    setDraft(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 4000);
  }

  if (!consent) {
    return (
      <div className="card p-6" data-testid="cookie-preferences">
        <h2 className="text-sm font-bold text-charcoal">Your current choice</h2>
        <p className="mt-2 text-xs text-smoke-600 leading-relaxed">
          You haven&apos;t made a cookie choice yet. Only strictly necessary cookies are active while you decide — your
          basket and sign-in work without any optional cookies.
        </p>
        <div className="mt-4 space-y-4">
          {CATEGORIES.map(cat => (
            <ToggleRow
              key={cat.id}
              cat={cat}
              checked={false}
              locked={false}
              onChange={value => setDraft(d => ({ ...d, [cat.id]: value }))}
            />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => save(draft)} className="btn btn-primary">Save my choices</button>
          <button type="button" onClick={() => save({ analytics: true, marketing: true })} className="btn btn-outline">Accept all</button>
          <button type="button" onClick={() => save({ analytics: false, marketing: false })} className="btn btn-outline">Reject optional</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6" data-testid="cookie-preferences">
      <h2 className="text-sm font-bold text-charcoal">Your current choice</h2>
      <p className="mt-1 text-2xs text-smoke-500">
        Saved {new Date(consent.ts).toLocaleString()} ·{' '}
        <button type="button" className="text-ember underline underline-offset-2 font-semibold" onClick={() => { document.cookie = 'sg_consent=; path=/; max-age=0'; window.location.reload(); }}>
          Reset and review banner again
        </button>
      </p>

      <div className="mt-4 rounded-md bg-smoke-100 p-3 text-xs text-smoke-700">
        <span className="font-bold">Strictly necessary — always on.</span> Basket contents, region preference, sign-in
        security. These cannot be switched off because the shop literally will not work without them.
      </div>

      <div className="mt-4 space-y-4">
        {CATEGORIES.map(cat => (
          <ToggleRow key={cat.id} cat={cat} checked={draft[cat.id]} locked={false} onChange={value => setDraft(d => ({ ...d, [cat.id]: value }))} />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <button type="button" onClick={() => save(draft)} className="btn btn-primary">Save changes</button>
        {saved && (
          <span role="status" className="text-xs font-semibold text-feedback-success">
            Preferences saved ✓
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  cat,
  checked,
  locked,
  onChange,
}: {
  cat: Category;
  checked: boolean;
  locked?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-smoke-150 pt-4">
      <div className="min-w-0">
        <p className="text-xs font-bold text-charcoal">{cat.name}</p>
        <p className="mt-1 text-xs text-smoke-600 leading-relaxed">{cat.description}</p>
        <p className="mt-1 text-2xs text-smoke-500">Examples: {cat.examples.join(' · ')}</p>
      </div>
      <label className="shrink-0 inline-flex cursor-pointer" aria-label={`Toggle ${cat.name}`}>
        <input
          type="checkbox"
          role="switch"
          checked={locked || checked}
          disabled={locked}
          onChange={e => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="relative w-10 h-[22px] rounded-full bg-smoke-300 peer-checked:bg-feedback-success transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ember after:absolute after:top-[3px] after:left-[3px] after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[18px]" />
      </label>
    </div>
  );
}

export function ConsentLawNote() {
  return (
    <p className="text-xs text-smoke-500 mt-4 max-w-prose">
      Details of how we handle personal data, retention periods and your rights are in our{' '}
      <Link href="/privacy" className="text-ember underline underline-offset-2">privacy notice</Link>. You can withdraw or
      change consent at any time from this page.
    </p>
  );
}
