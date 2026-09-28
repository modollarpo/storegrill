import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { generateCsrfToken, validateCsrfToken, issueCsrfCookie, clearCsrfCookie } from './csrf.js';

describe('validateCsrfToken', () => {
  it('accepts a freshly generated token', () => {
    expect(validateCsrfToken(generateCsrfToken())).toBe(true);
  });

  it('rejects a token whose payload was tampered with', () => {
    const token = generateCsrfToken();
    const [raw, sig] = token.split('.');
    const tampered = `${raw.replace(/^./, c => (c === 'a' ? 'b' : 'a'))}.${sig}`;
    expect(validateCsrfToken(tampered)).toBe(false);
  });

  it('rejects a token with no signature instead of throwing', () => {
    expect(() => validateCsrfToken('deadbeef')).not.toThrow();
    expect(validateCsrfToken('deadbeef')).toBe(false);
  });

  it('rejects a truncated signature without throwing on a length mismatch', () => {
    const token = generateCsrfToken();
    const [raw, sig] = token.split('.');
    expect(() => validateCsrfToken(`${raw}.${sig.slice(0, 8)}`)).not.toThrow();
    expect(validateCsrfToken(`${raw}.${sig.slice(0, 8)}`)).toBe(false);
  });

  it('rejects an over-long signature without throwing on a length mismatch', () => {
    const token = generateCsrfToken();
    const [raw, sig] = token.split('.');
    expect(() => validateCsrfToken(`${raw}.${sig}ff`)).not.toThrow();
    expect(validateCsrfToken(`${raw}.${sig}ff`)).toBe(false);
  });

  it('rejects empty and malformed values', () => {
    for (const value of ['', '.', 'a.', '.b', 'nodot']) {
      expect(() => validateCsrfToken(value)).not.toThrow();
      expect(validateCsrfToken(value)).toBe(false);
    }
  });
});

function fakeCookieExchange(cookies?: Record<string, string>) {
  const setCookie = vi.fn();
  const req = { cookies: cookies ?? {} } as unknown as Request;
  const res = { cookie: setCookie } as unknown as Response;
  const next = vi.fn();
  return { req, res, next, setCookie };
}

describe('issueCsrfCookie', () => {
  it('issues a valid, JS-readable token to a visitor with no cookie', () => {
    const { req, res, next, setCookie } = fakeCookieExchange();

    issueCsrfCookie(req, res, next);

    expect(setCookie).toHaveBeenCalledTimes(1);
    const [name, token, options] = setCookie.mock.calls[0];
    expect(name).toBe('sg_csrf');
    expect(validateCsrfToken(token)).toBe(true);
    expect(options).toMatchObject({ httpOnly: false, path: '/' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('issues a token even when cookie parsing produced no cookies at all', () => {
    const { req, res, next, setCookie } = fakeCookieExchange();
    (req as unknown as { cookies: undefined }).cookies = undefined;

    issueCsrfCookie(req, res, next);

    expect(setCookie).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite a token the visitor already holds', () => {
    const existing = generateCsrfToken();
    const { req, res, next, setCookie } = fakeCookieExchange({ sg_csrf: existing });

    issueCsrfCookie(req, res, next);

    expect(setCookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces a token the visitor holds that fails validation', () => {
    const { req, res, next, setCookie } = fakeCookieExchange({ sg_csrf: 'forged.signature' });

    issueCsrfCookie(req, res, next);

    expect(setCookie).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('scopes the cookie to the shared parent domain so the storefront can read it', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevDomain = process.env.COOKIE_DOMAIN;
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_DOMAIN = '.storegrill.net';
    vi.resetModules();

    try {
      const prod = await import('./csrf.js');
      const { req, res, next, setCookie } = fakeCookieExchange();

      prod.issueCsrfCookie(req, res, next);

      const [, , options] = setCookie.mock.calls[0];
      expect(options).toMatchObject({
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        domain: '.storegrill.net',
        path: '/',
      });
    } finally {
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      if (prevDomain === undefined) delete process.env.COOKIE_DOMAIN;
      else process.env.COOKIE_DOMAIN = prevDomain;
      vi.resetModules();
    }
  });
});

describe('clearCsrfCookie', () => {
  it('clears using the same domain and path the cookie was issued with', () => {
    const clearCookie = vi.fn();
    const req = {} as unknown as Request;
    const res = { clearCookie } as unknown as Response;

    clearCsrfCookie(req, res);

    expect(clearCookie).toHaveBeenCalledTimes(1);
    const [name, options] = clearCookie.mock.calls[0];
    expect(name).toBe('sg_csrf');
    expect(options).toMatchObject({ path: '/' });
    expect(options.domain).toBe(
      process.env.COOKIE_DOMAIN || (process.env.NODE_ENV === 'production' ? '.storegrill.net' : undefined)
    );
  });
});
