import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function generateTokens(user: AuthUser, tokenVersion = 0) {
  const accessToken = jwt.sign({ ...user, tokenVersion }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh', tokenVersion },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  try {
    const decoded = verifyToken(token) as AuthUser & { tokenVersion?: number };
    const fresh = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true, tokenVersion: true, emailVerified: true },
    });
    if (!fresh || fresh.tokenVersion !== (decoded.tokenVersion ?? 0)) {
      return res.status(401).json({ error: { code: 'SESSION_REVOKED', message: 'Session is no longer valid' } });
    }
    req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role: fresh.role };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
    next();
  };
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.accessToken;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken;

  if (token) {
    try {
      const decoded = verifyToken(token) as AuthUser & { tokenVersion?: number };
      const fresh = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { role: true, tokenVersion: true },
      });
      if (fresh && fresh.tokenVersion === (decoded.tokenVersion ?? 0)) {
        req.user = { id: decoded.id, email: decoded.email, name: decoded.name, role: fresh.role };
      }
    } catch {
      // Token invalid, continue without auth
    }
  }
  next();
}

export async function requireVerifiedEmail(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { emailVerified: true, role: true },
  });
  if (!user) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  if (!user.emailVerified && user.role !== 'ADMIN') {
    return res.status(403).json({
      error: { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email address to continue' },
    });
  }
  next();
}
