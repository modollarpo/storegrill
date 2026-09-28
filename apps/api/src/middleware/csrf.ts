import type { Request, Response, NextFunction, CookieOptions } from 'express';
import crypto from 'crypto';
import { COOKIE_DOMAIN } from '../lib/auth-cookies.js';

const CSRF_COOKIE = 'sg_csrf';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'dev-csrf-fallback';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = [
  '/api/v1/payments/webhook',
  '/api/v1/tracking/webhook',
  '/api/v1/auth',
  '/api/health',
  '/api/v1/docs',
];

function signToken(token: string): string {
  return crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
}

export function generateCsrfToken(): string {
  const raw = crypto.randomBytes(32).toString('hex');
  return `${raw}.${signToken(raw)}`;
}

export function validateCsrfToken(token: string): boolean {
  const [raw, sig] = token.split('.');
  if (!raw || !sig) return false;
  const expected = Buffer.from(signToken(raw));
  const provided = Buffer.from(sig);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

function csrfCookieCandidates(req: Request): string[] {
  const raw = req.headers?.cookie;
  if (typeof raw === 'string' && raw.includes(`${CSRF_COOKIE}=`)) {
    const parsed = raw
      .split(';')
      .map(part => part.trim())
      .filter(part => part.startsWith(`${CSRF_COOKIE}=`))
      .map(part => decodeURIComponent(part.slice(CSRF_COOKIE.length + 1)))
      .filter(Boolean);
    if (parsed.length) return parsed;
  }
  const parsedByMiddleware = req.cookies?.[CSRF_COOKIE];
  return parsedByMiddleware ? [parsedByMiddleware] : [];
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const path = req.path;
  if (EXEMPT_PATHS.some(p => path.startsWith(p))) return next();

  const candidates = csrfCookieCandidates(req);
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!candidates.length || !headerToken) {
    res.status(403).json({ error: 'Missing CSRF token' });
    return;
  }

  const matched = candidates.some(token => token === headerToken && validateCsrfToken(token));
  if (!matched) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

export function csrfCookieOptions(): CookieOptions {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false,
    secure: prod,
    sameSite: prod ? ('none' as const) : ('lax' as const),
    domain: COOKIE_DOMAIN,
    path: '/',
    maxAge: 60 * 60 * 1000,
  };
}

export function setCsrfCookie(_req: Request, res: Response): void {
  res.cookie(CSRF_COOKIE, generateCsrfToken(), csrfCookieOptions());
}

export function clearCsrfCookie(_req: Request, res: Response): void {
  res.clearCookie(CSRF_COOKIE, { domain: COOKIE_DOMAIN, path: '/' });
}

export function issueCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  const candidates = csrfCookieCandidates(req);
  if (candidates.some(validateCsrfToken)) {
    next();
    return;
  }
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  setCsrfCookie(req, res);
  next();
}
