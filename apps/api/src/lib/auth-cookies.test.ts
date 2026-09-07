import { describe, it, expect } from 'vitest';
import { accessCookieOptions, refreshCookieOptions } from './auth-cookies.js';

describe('auth cookie options', () => {
  it('production: first-party cross-subdomain session cookies (Secure + SameSite=None + domain)', () => {
    const opts = accessCookieOptions(true, '.storegrill.net');
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('none');
    expect(opts.domain).toBe('.storegrill.net');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(15 * 60 * 1000);
  });

  it('refresh token cookie keeps the 7-day max age', () => {
    const opts = refreshCookieOptions(true, '.storegrill.net');
    expect(opts.sameSite).toBe('none');
    expect(opts.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('local development: host-only non-secure Lax cookies (no domain attribute)', () => {
    const opts = accessCookieOptions(false);
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe('lax');
    expect(opts.domain).toBeUndefined();
  });
});