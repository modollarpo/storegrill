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

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'include' });
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
  return res.json() as Promise<T>;
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
