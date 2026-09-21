import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';

const GUEST_SESSION_COOKIE = 'sg_guest_session';
const GUEST_SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return 'dev-insecure-secret-do-not-use-in-production';
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface DualAuthRequest extends Request {
  user?: AuthUser;
  guestSessionId?: string;
  isGuest?: boolean;
}

function generateGuestSessionId(): string {
  return `guest_${crypto.randomBytes(24).toString('hex')}`;
}

function getGuestSessionId(req: Request): string | undefined {
  const cookie = req.cookies?.[GUEST_SESSION_COOKIE];
  if (cookie && cookie.startsWith('guest_')) return cookie;
  return undefined;
}

export function setGuestSessionCookie(res: Response, sessionId: string): void {
  res.cookie(GUEST_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: GUEST_SESSION_MAX_AGE,
  });
}

export async function dualAuth(req: DualAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken;

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as AuthUser & { tokenVersion?: number };
      const fresh = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { role: true, tokenVersion: true },
      });
      if (fresh && fresh.tokenVersion === (decoded.tokenVersion ?? 0)) {
        req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role: fresh.role };
        req.isGuest = false;
        return next();
      }
    } catch {
      // Token invalid, fall through to guest
    }
  }

  let sessionId = getGuestSessionId(req);
  if (!sessionId) {
    sessionId = generateGuestSessionId();
    setGuestSessionCookie(res, sessionId);
  }
  req.guestSessionId = sessionId;
  req.isGuest = true;
  next();
}

export async function requireAuthOrGuestEmail(req: DualAuthRequest, res: Response, next: NextFunction) {
  if (req.user) return next();
  if (req.guestSessionId) return next();
  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
}
