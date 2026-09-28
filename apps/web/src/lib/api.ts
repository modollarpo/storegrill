export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CSRF_COOKIE = 'sg_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1];
}

let csrfBootstrap: Promise<void> | null = null;

async function ensureCsrfToken(): Promise<void> {
  if (readCookie(CSRF_COOKIE)) return;
  csrfBootstrap ??= fetch(`${API_BASE}/api/health`, { credentials: 'include' })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => { csrfBootstrap = null; });
  await csrfBootstrap;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };

  if (!SAFE_METHODS.has(method)) {
    await ensureCsrfToken();
    const token = readCookie(CSRF_COOKIE);
    if (token) headers[CSRF_HEADER] = token;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
  } catch (cause) {
    // A rejected fetch means the response never reached us: DNS failure, an
    // offline client, a gateway 502/504 without CORS headers, or a CORS block.
    // It is a transport fault, not a validation error, so it gets its own type
    // and keeps the original cause for the console instead of collapsing into
    // an undiagnosable generic failure.
    throw new NetworkError(`Could not reach the store (${method} ${path})`, 0, 'NETWORK_ERROR', cause);
  }

  if (!res.ok) {
    let code = 'REQUEST_FAILED';
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      const err = body?.error;
      if (typeof err === 'string') {
        message = err;
      } else if (err) {
        code = err.code || code;
        message = err.message || message;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch (cause) {
    throw new NetworkError(
      `Malformed response from the store (${method} ${path}, status ${res.status})`,
      res.status,
      'MALFORMED_RESPONSE',
      cause
    );
  }
}

export async function csrfHeaders(): Promise<Record<string, string>> {
  await ensureCsrfToken();
  const token = readCookie(CSRF_COOKIE);
  return token ? { [CSRF_HEADER]: token } : {};
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * A transport-level failure: the request never produced a readable response.
 *
 * Distinct from ApiError because the server may or may not have seen the
 * request. Retrying is safe for idempotent reads, and the caller must not
 * present it as a validation problem the shopper can fix.
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    override readonly cause?: unknown
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** True when the failure was transport-level rather than a server response. */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/** True when the server answered with an error status. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
