import { Router, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { prisma } from '../index.js';
import { generateTokens } from '../middleware/auth.js';
import { PROVIDER_CONFIGS, buildAuthorizeUrl, fetchToken, fetchProfile } from '../auth/oauth/config.js';

const router = Router();

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3000';

function providerConfigured(provider: string): boolean {
  const idKey = `${provider.toUpperCase()}_CLIENT_ID`;
  const secretKey = `${provider.toUpperCase()}_CLIENT_SECRET`;
  return Boolean(process.env[idKey] && process.env[secretKey]);
}

router.get('/providers', (_req: Request, res: Response) => {
  const configured = ['google', 'facebook', 'linkedin'].filter(providerConfigured);
  res.json({ providers: configured });
});

router.get('/:provider/start', (req: Request, res: Response) => {
  const provider = String(req.params.provider);
  if (!PROVIDER_CONFIGS[provider]) {
    return res.status(404).json({ error: { code: 'UNKNOWN_PROVIDER', message: 'Unknown OAuth provider' } });
  }
  if (!providerConfigured(provider)) {
    return res.status(400).json({ error: { code: 'OAUTH_NOT_CONFIGURED', message: 'OAuth not configured for this provider' } });
  }

  const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`] as string;
  const state = randomBytes(32).toString('hex');
  const redirectUri = `${API_BASE_URL}/api/v1/auth/oauth/${provider}/callback`;

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: `/api/v1/auth/oauth/${provider}/callback`,
  });

  return res.redirect(302, buildAuthorizeUrl(provider, clientId, redirectUri, state));
});

router.get('/:provider/callback', async (req: Request, res: Response) => {
  const provider = String(req.params.provider);
  const cfg = PROVIDER_CONFIGS[provider];
  if (!cfg || !providerConfigured(provider)) {
    return res.redirect(302, `${WEB_BASE_URL}/auth/signin?error=oauth_not_configured`);
  }

  const { code, state } = req.query as { code?: string; state?: string };
  const expectedState = req.cookies?.oauth_state;
  res.clearCookie('oauth_state', { path: `/api/v1/auth/oauth/${provider}/callback` });

  if (!code || !state || !expectedState || state !== expectedState) {
    return res.redirect(302, `${WEB_BASE_URL}/auth/signin?error=oauth_state_mismatch`);
  }

  try {
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`] as string;
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`] as string;
    const redirectUri = `${API_BASE_URL}/api/v1/auth/oauth/${provider}/callback`;

    const token = await fetchToken(provider, code, redirectUri, clientId, clientSecret);
    const profile = await fetchProfile(provider, token.access_token);
    if (!profile.providerId || !profile.email) {
      return res.redirect(302, `${WEB_BASE_URL}/auth/signin?error=oauth_profile_incomplete`);
    }

    let user = await prisma.user.findFirst({
      where: { oauthAccounts: { some: { provider, providerAccountId: profile.providerId } } },
    });

    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            avatar: byEmail.avatar ?? profile.avatar ?? null,
            oauthAccounts: {
              create: { provider, providerAccountId: profile.providerId },
            },
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            password: null,
            name: profile.name || profile.email.split('@')[0],
            role: 'CUSTOMER',
            avatar: profile.avatar ?? null,
            customerProfile: {
              create: {
                preferredRegionKey: 'US',
                defaultCurrency: 'USD',
                defaultLanguage: 'en',
                shippingAddresses: '[]',
              },
            },
            oauthAccounts: {
              create: { provider, providerAccountId: profile.providerId },
            },
          },
        });
      }
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

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

    return res.redirect(302, `${WEB_BASE_URL}${req.cookies?.['sg_oauth_next'] || '/'}`);
  } catch (err) {
    console.error(`OAuth callback failed for ${provider}:`, err);
    return res.redirect(302, `${WEB_BASE_URL}/auth/signin?error=oauth_failed`);
  }
});

export default router;
