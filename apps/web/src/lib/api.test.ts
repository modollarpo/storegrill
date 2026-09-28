import { describe, it, expect } from 'vitest';
import { api, ApiError, NetworkError, isNetworkError } from './api';

/**
 * Asserts the call rejects and hands back the typed error. A test that only
 * inspects the resolved value passes when the request unexpectedly succeeds.
 */
async function captureRejection(promise: Promise<unknown>): Promise<NetworkError | ApiError> {
  return promise.then(
    () => {
      throw new Error('expected the request to reject, but it resolved');
    },
    (error: unknown) => error as NetworkError | ApiError
  );
}

async function withMockedFetch(
  impl: typeof fetch,
  run: () => Promise<void>
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

describe('api error typing', () => {
  it('classifies a rejected fetch as a transport fault', async () => {
    const impl = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;

    await withMockedFetch(impl, async () => {
      const error = await captureRejection(api('/api/v1/orders/checkout', { method: 'POST' }));

      expect(error).toBeInstanceOf(NetworkError);
      expect(isNetworkError(error)).toBe(true);
      if (!(error instanceof NetworkError)) throw new Error('expected a NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.cause).toBeInstanceOf(TypeError);
    });
  });

  it('classifies an unreadable success body separately from a rejection', async () => {
    const impl = (async () =>
      new Response('<html>gateway</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })) as unknown as typeof fetch;

    await withMockedFetch(impl, async () => {
      const error = await captureRejection(api('/api/v1/regions'));

      expect(error).toBeInstanceOf(NetworkError);
      expect(isNetworkError(error)).toBe(true);
      if (!(error instanceof NetworkError)) throw new Error('expected a NetworkError');
      expect(error.code).toBe('MALFORMED_RESPONSE');
    });
  });

  it('keeps a server error response as an ApiError with its code', async () => {
    const impl = (async () =>
      new Response(JSON.stringify({ error: { code: 'INVALID_ADDRESS', message: 'bad address' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;

    await withMockedFetch(impl, async () => {
      const error = await captureRejection(api('/api/v1/orders/checkout', { method: 'POST' }));

      expect(error).toBeInstanceOf(ApiError);
      expect(isNetworkError(error)).toBe(false);
      if (!(error instanceof ApiError)) throw new Error('expected an ApiError');
      expect(error.status).toBe(400);
      expect(error.code).toBe('INVALID_ADDRESS');
      expect(error.message).toBe('bad address');
    });
  });

  it('falls back to a readable message when the error body is not JSON', async () => {
    const impl = (async () =>
      new Response('gateway timeout', {
        status: 504,
        headers: { 'content-type': 'text/plain' },
      })) as unknown as typeof fetch;

    await withMockedFetch(impl, async () => {
      const error = await captureRejection(api('/api/v1/orders/checkout', { method: 'POST' }));

      expect(error).toBeInstanceOf(ApiError);
      if (!(error instanceof ApiError)) throw new Error('expected an ApiError');
      expect(error.status).toBe(504);
      expect(error.message).toBe('Request failed with status 504');
    });
  });
});
