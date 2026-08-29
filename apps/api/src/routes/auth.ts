import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../index.js';
import { generateTokens, authenticate, AuthRequest } from '../middleware/auth.js';
import { RegisterSchema, LoginSchema, ForgotPasswordSchema, ResetPasswordSchema } from '@Storegrill/shared';
import { sendMail } from '../lib/mailer.js';

const router = Router();

const WEB_BASE = process.env.WEB_BASE_URL || 'http://localhost:3000';
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

async function issueEmailToken(userId: string, type: string, ttlMs: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await prisma.emailToken.create({
    data: { userId, type, tokenHash, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function consumeEmailToken(token: string, type: string): Promise<{ userId: string } | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.emailToken.findUnique({ where: { tokenHash } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }
  await prisma.emailToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { userId: record.userId };
}

router.post('/register', async (req: Request, res: Response) => {
  const body = RegisterSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (existing) {
    return res.status(409).json({
      error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' },
    });
  }

  const hashedPassword = await bcrypt.hash(body.password, 12);

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      password: hashedPassword,
      name: body.name,
      role: 'CUSTOMER',
      customerProfile: {
        create: {
          preferredRegionKey: 'UK',
          defaultCurrency: 'GBP',
          defaultLanguage: 'en',
          shippingAddresses: '[]',
        },
      },
    },
    select: { id: true, email: true, name: true, role: true, tokenVersion: true, createdAt: true },
  });

  const verifyToken = await issueEmailToken(user.id, 'EMAIL_VERIFY', VERIFY_TOKEN_TTL_MS);
  await sendMail({
    to: user.email,
    subject: 'Verify your Storegrill account',
    text: `Welcome to Storegrill! Verify your email: ${WEB_BASE}/auth/verify-email?token=${verifyToken}`,
    html: `<p>Welcome to Storegrill, ${user.name}!</p><p><a href="${WEB_BASE}/auth/verify-email?token=${verifyToken}">Verify your email address</a></p><p>This link expires in 24 hours.</p>`,
  }).catch(err => console.error('[auth] verification email failed:', err.message));

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    }, user.tokenVersion);

  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ user, ...tokens });
});

router.post('/login', async (req: Request, res: Response) => {
  const body = LoginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !user.password) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  const valid = await bcrypt.compare(body.password, user.password);
  if (!valid) {
    return res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
    });
  }

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    }, user.tokenVersion);

  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: Boolean(user.emailVerified),
    },
    ...tokens,
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({
      error: { code: 'MISSING_TOKEN', message: 'Refresh token required' },
    });
  }

  try {
    const { verifyToken } = await import('../middleware/auth.js');
    const payload = verifyToken(refreshToken) as unknown as { id: string; type: string };

    if (payload.type !== 'refresh') {
      return res.status(401).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
      });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      return res.status(401).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      });
    }
    if (((payload as unknown as { tokenVersion?: number }).tokenVersion ?? 0) !== user.tokenVersion) {
      return res.status(401).json({
        error: { code: 'SESSION_REVOKED', message: 'Session is no longer valid' },
      });
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, user.tokenVersion);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.json(tokens);
  } catch {
    return res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
    });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, name: true, role: true, avatar: true, phone: true,
      emailVerified: true, createdAt: true,
      customerProfile: true,
      vendorProfile: {
        select: {
          id: true, storeName: true, slug: true, status: true, rating: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found' },
    });
  }

  res.json({ user: { ...user, emailVerified: Boolean(user.emailVerified) } });
});

router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).optional(),
    avatar: z.string().url().optional(),
  }).parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: body,
    select: { id: true, email: true, name: true, role: true, avatar: true, phone: true },
  });

  res.json({ user });
});

router.post('/verify-email', async (req: Request, res: Response) => {
  const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
  const consumed = await consumeEmailToken(token, 'EMAIL_VERIFY');
  if (!consumed) {
    return res.status(400).json({
      error: { code: 'INVALID_TOKEN', message: 'Verification link is invalid or has expired' },
    });
  }
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { emailVerified: new Date() },
  });
  res.json({ message: 'Email verified successfully' });
});

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 3 : 30,
  keyGenerator: (req: Request) => {
    const authReq = req as Request & { user?: { id: string } };
    return authReq.user?.id ?? req.ip ?? 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/resend-verification', authenticate, resendLimiter, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
  }
  if (user.emailVerified) {
    return res.status(400).json({ error: { code: 'ALREADY_VERIFIED', message: 'Email is already verified' } });
  }
  const verifyToken = await issueEmailToken(user.id, 'EMAIL_VERIFY', VERIFY_TOKEN_TTL_MS);
  await sendMail({
    to: user.email,
    subject: 'Verify your Storegrill account',
    text: `Verify your email: ${WEB_BASE}/auth/verify-email?token=${verifyToken}`,
    html: `<p><a href="${WEB_BASE}/auth/verify-email?token=${verifyToken}">Verify your email address</a></p><p>This link expires in 24 hours.</p>`,
  }).catch(err => console.error('[auth] verification email failed:', err.message));
  res.json({ message: 'Verification email sent' });
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  const body = ForgotPasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (user) {
    const resetToken = await issueEmailToken(user.id, 'PASSWORD_RESET', RESET_TOKEN_TTL_MS);
    await sendMail({
      to: user.email,
      subject: 'Reset your Storegrill password',
      text: `Reset your password: ${WEB_BASE}/auth/reset-password?token=${resetToken}`,
      html: `<p>We received a request to reset your password.</p><p><a href="${WEB_BASE}/auth/reset-password?token=${resetToken}">Choose a new password</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
    }).catch(err => console.error('[auth] reset email failed:', err.message));
  }

  res.json({ message: 'If an account exists with that email, a reset link has been sent' });
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const body = ResetPasswordSchema.parse(req.body);
  const consumed = await consumeEmailToken(body.token, 'PASSWORD_RESET');
  if (!consumed) {
    return res.status(400).json({
      error: { code: 'INVALID_TOKEN', message: 'Reset link is invalid or has expired' },
    });
  }
  const hashedPassword = await bcrypt.hash(body.password, 12);
  await prisma.user.update({
    where: { id: consumed.userId },
    data: { password: hashedPassword, tokenVersion: { increment: 1 } },
  });
  res.json({ message: 'Password updated successfully' });
});

router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    preferredRegionKey: z.string().min(2).max(3),
  }).parse(req.body);

  const region = await prisma.region.findUnique({ where: { key: body.preferredRegionKey } });
  if (!region) {
    return res.status(400).json({
      error: { code: 'INVALID_REGION', message: 'Unknown shipping region' },
    });
  }

  await prisma.customerProfile.upsert({
    where: { userId: req.user!.id },
    update: { preferredRegionKey: body.preferredRegionKey, defaultCurrency: region.defaultCurrency },
    create: {
      userId: req.user!.id,
      preferredRegionKey: body.preferredRegionKey,
      defaultCurrency: region.defaultCurrency,
      defaultLanguage: 'en',
      shippingAddresses: '[]',
    },
  });

  res.json({ preferences: { preferredRegionKey: body.preferredRegionKey } });
});

export { router as authRouter };
