import { describe, it, expect } from 'vitest';
import type { Server } from 'node:http';
import app from '../app.js';
import { buildCheckoutPayload, type BuildCheckoutInput } from '@Storegrill/shared';

/**
 * Contract guard between the storefront's checkout request and the real API.
 *
 * The payload builder and the route live in different packages, so nothing else
 * stops them drifting: a wrong enum value or a renamed field passes typecheck on
 * both sides and only fails for shoppers. Because the API resolves a payment
 * method to its provider server-side, the wire value is the region method id
 * (`card`), never the provider name (`stripe`).
 *
 * Each case runs on its own server because a request that reaches the database
 * cannot be served in an environment without one, and one pending connection
 * would otherwise stall every later case in the file.
 */
const ADDRESS = {
  label: 'Home',
  street: '10 Downing Street',
  line2: 'Flat 4',
  city: 'London',
  state: 'Greater London',
  zip: 'SW1A 2AA',
  country: 'GB',
  isDefault: false,
};

/**
 * The negative cases exist precisely to prove the API rejects bad wire values,
 * so the payment method override is deliberately widened past the type the
 * builder would allow.
 */
function payload(
  overrides: { paymentMethod?: string } & Omit<Partial<BuildCheckoutInput>, 'paymentMethod'> = {}
): Record<string, unknown> {
  // The cast is deliberate: only the negative cases below widen paymentMethod,
  // and the point of them is that the API - not the type system - rejects it.
  return buildCheckoutPayload({
    address: ADDRESS,
    paymentMethod: 'card',
    regionKey: 'UK',
    language: 'en',
    email: 'shopper@example.com',
    createAccount: false,
    accountName: '',
    accountPassword: '',
    saveAddress: false,
    notes: '',
    ...overrides,
  } as BuildCheckoutInput);
}

interface Session {
  cookie: string;
  header: string;
}

async function withApi(run: (baseUrl: string) => Promise<void>): Promise<void> {
  const server: Server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    await run(`http://localhost:${port}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

async function openSession(baseUrl: string): Promise<Session> {
  const res = await fetch(`${baseUrl}/api/health`, { headers: { connection: 'close' } });
  const raw = res.headers.get('set-cookie') || '';
  const match = /sg_csrf=([^;]+)/.exec(raw);
  if (!match) throw new Error(`no sg_csrf cookie issued: ${raw}`);
  const value = decodeURIComponent(match[1]);
  return { cookie: `sg_csrf=${encodeURIComponent(value)}`, header: value };
}

async function checkout(baseUrl: string, body: unknown, session: Session): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/orders/checkout`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: session.cookie,
      'x-csrf-token': session.header,
    },
    body: JSON.stringify(body),
  });
}

async function expectCheckoutError(
  body: unknown,
  expectedCode: string
): Promise<void> {
  await withApi(async baseUrl => {
    const session = await openSession(baseUrl);
    const res = await checkout(baseUrl, body, session);
    const json = (await res.json()) as { error?: { code?: string } };
    expect(res.status, `expected 4xx for ${expectedCode}, got ${res.status}`).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(json.error?.code).toBe(expectedCode);
  });
}

describe('POST /api/v1/orders/checkout rejects bad requests cleanly', () => {
  it('rejects a provider name instead of hanging', () =>
    expectCheckoutError(payload({ paymentMethod: 'stripe' }), 'VALIDATION_ERROR'));

  it('rejects a postcode that does not match the country', () =>
    expectCheckoutError(
      payload({ address: { ...ADDRESS, zip: 'NOT-A-POSTCODE' } }),
      'INVALID_ADDRESS'
    ));

  it('rejects a country that requires a state when none is given', () =>
    expectCheckoutError(
      payload({
        address: { ...ADDRESS, country: 'US', state: '', zip: '94105' },
      }),
      'INVALID_ADDRESS'
    ));

  it('rejects a payment method the processor cannot handle', () =>
    expectCheckoutError(payload({ paymentMethod: 'twint' }), 'PAYMENT_METHOD_UNAVAILABLE'));

  it('rejects guest checkout without an email', () =>
    expectCheckoutError(payload({ email: '' }), 'VALIDATION_ERROR'));

  it('rejects an account creation without a password', () =>
    expectCheckoutError(
      payload({ createAccount: true, accountName: 'Ada', accountPassword: '' }),
      'VALIDATION_ERROR'
    ));
});
