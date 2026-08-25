'use client';

export const CONSENT_COOKIE = 'sg_consent';

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: number;
}

export const DEFAULT_CONSENT: CookieConsent = { necessary: true, analytics: false, marketing: false, ts: 0 };

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<CookieConsent>;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') return null;
    return { necessary: true, analytics: parsed.analytics, marketing: parsed.marketing, ts: Number(parsed.ts) || 0 };
  } catch {
    return null;
  }
}

export function writeConsent(consent: Omit<CookieConsent, 'necessary' | 'ts'>): CookieConsent {
  const full: CookieConsent = { necessary: true, ...consent, ts: Date.now() };
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(full))}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
  window.dispatchEvent(new Event('storegrill:consent-changed'));
  return full;
}
