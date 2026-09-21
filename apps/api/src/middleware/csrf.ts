import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

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
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signToken(raw)));
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const path = req.path;
  if (EXEMPT_PATHS.some(p => path.startsWith(p))) return next();

  const cookieToken = req.cookies?.[CSRF_HEADER] || req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ error: 'Missing CSRF token' });
    return;
  }

  if (!validateCsrfToken(cookieToken) || cookieToken !== headerToken) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

export function setCsrfCookie(_req: Request, res: Response): void {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 1000,
  });
}
