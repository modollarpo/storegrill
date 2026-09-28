import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError, csrfHeaders } from './api';

function mockFetch(response: Response, capture?: { headers?: HeadersInit }) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (capture) capture.headers = init?.headers as HeadersInit;
    return response;
  });
}

function setCsrfCookie(value: string) {
  document.cookie = `sg_csrf=${value}; path=/`;
}

function clearCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api() CSRF double-submit', () => {
  beforeEach(() => {
    clearCookies();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearCookies();
  });

  it('echoes the sg_csrf cookie as x-csrf-token on POST', async () => {
    setCsrfCookie('abc.def');
    const capture: { headers?: HeadersInit } = {};
    vi.stubGlobal('fetch', mockFetch(jsonResponse({ ok: true }), capture));

    await api('/api/v1/orders/checkout', { method: 'POST', body: '{}' });

    expect((capture.headers as Record<string, string>)['x-csrf-token']).toBe('abc.def');
  });

  it('echoes the CSRF token on PUT, PATCH and DELETE', async () => {
    setCsrfCookie('abc.def');
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const capture: { headers?: HeadersInit } = {};
      vi.stubGlobal('fetch', mockFetch(jsonResponse({ ok: true }), capture));

      await api('/api/v1/thing', { method, body: '{}' });

      expect((capture.headers as Record<string, string>)['x-csrf-token']).toBe('abc.def');
    }
  });

  it('does not send the CSRF header on safe methods', async () => {
    setCsrfCookie('abc.def');
    const capture: { headers?: HeadersInit } = {};
    vi.stubGlobal('fetch', mockFetch(jsonResponse({ ok: true }), capture));

    await api('/api/v1/products');

    expect((capture.headers as Record<string, string>)['x-csrf-token']).toBeUndefined();
  });

  it('bootstraps the token before a mutating request when no cookie exists yet', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      if (String(url).includes('/api/health')) {
        return new Response('ok', { status: 200, headers: { 'Set-Cookie': 'sg_csrf=boot.strapped' } });
      }
      return jsonResponse({ ok: true });
    }));

    await api('/api/v1/cart/items', { method: 'POST', body: '{}' });

    expect(calls[0]).toContain('/api/health');
  });

  it('does not overwrite caller-supplied headers', async () => {
    setCsrfCookie('abc.def');
    const capture: { headers?: HeadersInit } = {};
    vi.stubGlobal('fetch', mockFetch(jsonResponse({ ok: true }), capture));

    await api('/api/v1/x', { method: 'POST', headers: { 'X-Custom': 'keep' } });

    expect((capture.headers as Record<string, string>)['X-Custom']).toBe('keep');
  });

  it('surfaces a string error body verbatim instead of a generic status message', async () => {
    vi.stubGlobal('fetch', mockFetch(jsonResponse({ error: 'Missing CSRF token' }, 403)));

    await expect(api('/api/v1/orders/checkout', { method: 'POST' })).rejects.toThrow('Missing CSRF token');
  });

  it('surfaces a structured error body', async () => {
    vi.stubGlobal('fetch', mockFetch(jsonResponse({ error: { code: 'EMPTY_CART', message: 'Cart is empty' } }, 400)));

    const err = await api('/api/v1/orders/checkout', { method: 'POST' }).catch(e => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('EMPTY_CART');
    expect((err as ApiError).message).toBe('Cart is empty');
  });
});

describe('csrfHeaders()', () => {
  beforeEach(() => clearCookies());
  afterEach(() => {
    vi.unstubAllGlobals();
    clearCookies();
  });

  it('returns the current token without a network call when the cookie exists', async () => {
    setCsrfCookie('abc.def');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(csrfHeaders()).resolves.toEqual({ 'x-csrf-token': 'abc.def' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
