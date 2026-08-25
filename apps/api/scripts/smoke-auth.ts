import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_URL || 'http://localhost:3001';
const email = `phasea-${Date.now()}@example.com`;
const password = 'Passw0rd123';
let accessToken = '';
const results: Array<[string, boolean, string]> = [];

function check(name: string, ok: boolean, detail = '') {
  results.push([name, ok, detail]);
}

async function call(path: string, init: RequestInit & { raw?: true } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((init.headers as Record<string, string>) || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main() {
  const reg = await call('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name: 'Phase A Tester', password }),
  });
  check('register returns 201', reg.status === 201, `got ${reg.status}`);
  const role = (reg.body as { user?: { role?: string } })?.user?.role;
  check('role forced to CUSTOMER', role === 'CUSTOMER', `role=${role}`);
  accessToken = (reg.body as { accessToken?: string })?.accessToken || '';

  const productRes = await fetch(`${API}/api/v1/products?limit=1`);
  const productData = (await productRes.json()) as { products?: Array<{ id: string }> };
  const productId = productData.products?.[0]?.id;

  const reviewAttempt = productId
    ? await call('/api/v1/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId, rating: 5, title: 't', body: 'b' }),
      })
    : { status: -1, body: null };
  check(
    'review blocked before verification',
    !productId ? false : reviewAttempt.status === 403 && (reviewAttempt.body as { error?: { code?: string } })?.error?.code === 'EMAIL_NOT_VERIFIED',
    `status=${reviewAttempt.status}`
  );

  const meBefore = await call('/api/v1/auth/me');
  const verifiedBefore = (meBefore.body as { user?: { emailVerified?: boolean } })?.user?.emailVerified;
  check('me reports unverified initially', verifiedBefore === false, `emailVerified=${verifiedBefore}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('user missing in DB');

  const verifyToken = crypto.randomBytes(32).toString('hex');
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      type: 'EMAIL_VERIFY',
      tokenHash: crypto.createHash('sha256').update(verifyToken).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const badVerify = await call('/api/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: 'deadbeefdeadbeef' }) });
  check('verify rejects garbage token', badVerify.status === 400);

  const verify = await call('/api/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: verifyToken }) });
  check('verify-email succeeds', verify.status === 200, `got ${verify.status}`);

  const reuse = await call('/api/v1/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: verifyToken }) });
  check('token single-use enforced', reuse.status === 400);

  const reviewOk = productId
    ? await call('/api/v1/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId, rating: 5, title: 'Smoke', body: 'Verified review' }),
      })
    : { status: -1 };
  check('review allowed after verification', !productId ? false : reviewOk.status >= 200 && reviewOk.status < 300, `status=${reviewOk.status}`);

  const forgotKnown = await call('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
  const forgotUnknown = await call('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: 'nobody@example.com' }) });
  check(
    'forgot-password generic response',
    forgotKnown.status === 200 &&
      JSON.stringify(forgotKnown.body) === JSON.stringify(forgotUnknown.body),
  );

  const resetToken = crypto.randomBytes(32).toString('hex');
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      tokenHash: crypto.createHash('sha256').update(resetToken).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const newPassword = 'N3wPassw0rd!';
  const preReset = await call('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  check('pre-reset login works', preReset.status === 200, `got ${preReset.status}`);
  const oldRefresh = (preReset.body as { refreshToken?: string })?.refreshToken || '';

  const reset = await call('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: resetToken, password: newPassword }),
  });
  check('reset-password succeeds', reset.status === 200, `got ${reset.status}`);

  accessToken = '';
  const staleRefresh = await fetch(`${API}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: oldRefresh }),
  });
  const staleCode = (await staleRefresh.json().catch(() => null)) as { error?: { code?: string } } | null;
  check(
    'refresh token revoked after reset',
    staleRefresh.status === 401 && staleCode?.error?.code === 'SESSION_REVOKED',
    `status=${staleRefresh.status}`
  );

  const relogin = await call('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: newPassword }),
  });
  check('login with new password', relogin.status === 200, `got ${relogin.status}`);
  const loginVerified = (relogin.body as { user?: { emailVerified?: boolean } })?.user?.emailVerified;
  check('login exposes emailVerified flag', loginVerified === true, `emailVerified=${loginVerified}`);
  accessToken = (relogin.body as { accessToken?: string })?.accessToken || '';

  const badPref = await call('/api/v1/auth/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferredRegionKey: 'ZZ' }),
  });
  check('preferences rejects unknown region', badPref.status === 400);

  const prefs = await call('/api/v1/auth/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferredRegionKey: 'EU' }),
  });
  check('preferences accepts valid region', prefs.status === 200, `got ${prefs.status}`);

  const meAfter = await call('/api/v1/auth/me');
  const savedRegion = ((meAfter.body as { user?: { customerProfile?: { preferredRegionKey?: string } } })?.user?.customerProfile?.preferredRegionKey);
  check('me returns persisted region', savedRegion === 'EU', `got ${savedRegion}`);

  const docs = await call('/api/v1/vendors/me/documents');
  check('documents list reachable for customer', docs.status === 200 && Array.isArray((docs.body as { documents?: unknown[] })?.documents), `status=${docs.status}`);

  let failed = 0;
  for (const [name, ok, detail] of results) {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
  }
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch(err => {
    console.error('SMOKE CRASH:', err);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
