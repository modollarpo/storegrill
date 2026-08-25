import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_URL || 'http://localhost:3001';
const stamp = Date.now();
const results: Array<[string, boolean, string]> = [];

function check(name: string, ok: boolean, detail = '') {
  results.push([name, ok, detail]);
}

async function call(path: string, init: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, body };
}

function verifyUser(email: string) {
  return prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
}

const business = {
  businessLegalName: 'Grill Gear Ltd',
  businessType: 'company',
  registrationNumber: `REG-${stamp}`,
  countryOfRegistration: 'GB',
};
const store = {
  storeName: `Smoke Grill Gear ${stamp}`,
  description: 'Premium grilling accessories tested on real charcoal every weekend.',
  supportEmail: 'support@grillgear.example',
};
const operations = {
  warehouseRegionKey: 'US',
  plannedCategories: ['outdoor', 'kitchen'],
};
const payoutBank = { type: 'bank', bankName: 'Monzo', accountLast4: '4242' };

async function runApplicantFlow(tag: string) {
  const email = `phaseb-${tag}-${stamp}@example.com`;
  const reg = await call('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, name: `Phase B ${tag}`, password: 'Passw0rd123' }),
  });
  check(`[${tag}] register`, reg.status === 201);
  await verifyUser(email);
  const token = (reg.body as any)?.accessToken as string;
  check(`[${tag}] token present`, Boolean(token));

  const anonApply = await call('/api/v1/vendors/apply', { method: 'POST', body: JSON.stringify({ step: 1 }) });
  check(`[${tag}] apply requires auth`, anonApply.status === 401);

  const p1 = await call('/api/v1/vendors/apply', { method: 'POST', token, body: JSON.stringify({ step: 1, business }) });
  if (p1.status !== 200) console.error(`[${tag}] step1 response:`, JSON.stringify(p1.body));
  check(`[${tag}] step1 saved`, p1.status === 200 && (p1.body as any).vendor.onboardingStep === 1);

  const p2 = await call('/api/v1/vendors/apply', { method: 'POST', token, body: JSON.stringify({ step: 2, store }) });
  if (p2.status !== 200) console.error(`[${tag}] step2 response:`, JSON.stringify(p2.body));
  const p3 = await call('/api/v1/vendors/apply', { method: 'POST', token, body: JSON.stringify({ step: 3, operations }) });
  if (p3.status !== 200) console.error(`[${tag}] step3 response:`, JSON.stringify(p3.body));
  const p4 = await call('/api/v1/vendors/apply', {
    method: 'POST',
    token,
    body: JSON.stringify({ step: 4, payout: { ...payoutBank, acceptTerms: true } }),
  });
  if (p4.status !== 200) console.error(`[${tag}] step4 response:`, JSON.stringify(p4.body));
  check(`[${tag}] steps persisted`, p4.status === 200 && (p4.body as any).vendor.businessLegalName === business.businessLegalName);

  const me = await call('/api/v1/vendors/me', { token });
  check(`[${tag}] /me visible to applicant without VENDOR role`, me.status === 200 && (me.body as any).vendor.storeName === store.storeName);

  const earlySubmit = await call('/api/v1/vendors/apply/submit', { method: 'POST', token: 'garbage' });
  check(`[${tag}] submit requires auth`, earlySubmit.status === 401 || earlySubmit.status === 403);

  const submit = await call('/api/v1/vendors/apply/submit', { method: 'POST', token, body: '{}' });
  if (submit.status !== 200) console.error(`[${tag}] submit response:`, JSON.stringify(submit.body));
  check(`[${tag}] submit moves to UNDER_REVIEW`, submit.status === 200 && (submit.body as any).vendor.status === 'UNDER_REVIEW');
  check(`[${tag}] commission snapshot 12%`, Number((submit.body as any).vendor.revenueSharePct) === 12);

  const resubmit = await call('/api/v1/vendors/apply/submit', { method: 'POST', token, body: '{}' });
  check(`[${tag}] double-submit blocked`, resubmit.status === 409);

  const editLocked = await call('/api/v1/vendors/apply', { method: 'POST', token, body: JSON.stringify({ step: 2, store: { description: 'x'.repeat(25) } }) });
  check(`[${tag}] editing locked after submit`, editLocked.status === 409);

  return { token, email };
}

async function main() {
  const adminLogin = await call('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@storegrill.net', password: 'Password123' }),
  });
  check('admin login', adminLogin.status === 200);
  const adminToken = (adminLogin.body as any)?.accessToken as string;

  const queue = await call('/api/v1/admin/vendors?status=UNDER_REVIEW', { token: adminToken });
  check('queue lists UNDER_REVIEW', queue.status === 200 && Array.isArray((queue.body as any).vendors));

  const applicantA = await runApplicantFlow('approve');
  const vendorIdA = ((await call('/api/v1/vendors/me', { token: applicantA.token })).body as any).vendor.id;

  const rejectNoNotes = await call(`/api/v1/admin/vendors/${vendorIdA}/reject`, { method: 'POST', token: adminToken, body: JSON.stringify({ reviewNotes: '' }) });
  check('reject requires notes', rejectNoNotes.status === 400);

  const approve = await call(`/api/v1/admin/vendors/${vendorIdA}/approve`, { method: 'POST', token: adminToken, body: JSON.stringify({}) });
  check('approve succeeds', approve.status === 200 && (approve.body as any).vendor.status === 'ACTIVE');
  const storefronts = (approve.body as any).storefronts as Array<{ regionKey: string; slug: string }>;
  check(
    'storefronts provisioned (US + warehouse region)',
    storefronts.length >= 1,
    storefronts.map(s => s.slug).join(','),
  );
  check('commission applied from config', approve.status === 200);

  const meAfterApprove = await fetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${applicantA.token}` } });
  const meAfterBody = (await meAfterApprove.json()) as any;
  check('role promoted to VENDOR after approval', meAfterBody?.user?.role === 'VENDOR', `role=${meAfterBody?.user?.role}`);

  const reloginVendor = await call('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: applicantA.email, password: 'Passw0rd123' }),
  });
  const freshTokenA = (reloginVendor.body as any)?.accessToken as string;
  check('re-login issues VENDOR token', ((reloginVendor.body as any)?.user?.role) === 'VENDOR');
  const portalAccess = await call('/api/v1/vendors/me/dashboard', { token: freshTokenA });
  check('vendor portal endpoints accessible', portalAccess.status === 200);

  const auditRows = await prisma.auditLog.count({ where: { entity: 'VendorProfile', entityId: vendorIdA, action: 'VENDOR_APPROVED' } });
  check('approval audited', auditRows === 1);

  const applicantB = await runApplicantFlow('reject');
  const vendorIdB = ((await call('/api/v1/vendors/me', { token: applicantB.token })).body as any).vendor.id;

  const reject = await call(`/api/v1/admin/vendors/${vendorIdB}/reject`, {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ reviewNotes: 'Registration number could not be verified with the registry.' }),
  });
  check('reject succeeds', reject.status === 200 && (reject.body as any).vendor.status === 'REJECTED');

  const reapplyEdit = await call('/api/v1/vendors/apply', { method: 'POST', token: applicantB.token, body: JSON.stringify({ step: 1, business }) });
  check('rejected applicant may edit and reapply', reapplyEdit.status === 200);
  const resubmitB = await call('/api/v1/vendors/apply/submit', { method: 'POST', token: applicantB.token, body: '{}' });
  check('reapplied application back to UNDER_REVIEW', resubmitB.status === 200 && (resubmitB.body as any).vendor.status === 'UNDER_REVIEW');

  const roleStillCustomer = await fetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${applicantB.token}` } });
  const bRole = ((await roleStillCustomer.json()) as any)?.user?.role;
  check('rejected applicant keeps CUSTOMER role', bRole === 'CUSTOMER');

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
