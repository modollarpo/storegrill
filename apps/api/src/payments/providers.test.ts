import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { initiateStripePayment, paypalMoney, verifyStripeSignature } from './providers.js';

function signedPayload(secret: string, payload: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

describe('verifyStripeSignature', () => {
  const secret = 'whsec_test_123';
  const payload = Buffer.from(JSON.stringify({ type: 'checkout.session.completed' }));

  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
  });
  afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('accepts a correctly signed payload', () => {
    const header = signedPayload(secret, payload.toString('utf8'));
    expect(verifyStripeSignature(payload, header)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const header = signedPayload(secret, payload.toString('utf8'));
    const tampered = Buffer.from(payload.toString('utf8').replace('completed', 'failed'));
    expect(verifyStripeSignature(tampered, header)).toBe(false);
  });

  it('rejects an attacker-signed payload with the wrong secret', () => {
    const header = signedPayload('whsec_evil', payload.toString('utf8'));
    expect(verifyStripeSignature(payload, header)).toBe(false);
  });

  it('rejects a missing signature header when a secret is configured', () => {
    expect(verifyStripeSignature(payload, undefined)).toBe(false);
  });

  it('rejects malformed headers', () => {
    expect(verifyStripeSignature(payload, 'garbage')).toBe(false);
  });

  it('skips verification when no webhook secret is configured', () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(verifyStripeSignature(payload, undefined)).toBe(true);
  });
});

describe('initiateStripePayment sandbox fallback', () => {
  it('captures instantly without redirect when no API key is configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await initiateStripePayment({
      orderNumber: 'SG-TEST-1',
      currencyCode: 'USD',
      totalMinorUnits: 5999,
      items: [{ name: 'Test product', unitPriceMinorUnits: 5999, quantity: 1 }],
    });
    expect(result.mode).toBe('sandbox');
    expect(result.status).toBe('CAPTURED');
    expect(result.providerPaymentId).toMatch(/^sbx_stripe_/);
    expect(result.redirectUrl).toBeUndefined();
  });
});

describe('paypalMoney', () => {
  it('formats two-decimal currencies from minor units', () => {
    expect(paypalMoney({ currencyCode: 'USD', totalMinorUnits: 5999 })).toEqual({
      currency_code: 'USD',
      value: '59.99',
    });
  });

  it('formats zero-decimal currencies without decimals', () => {
    expect(paypalMoney({ currencyCode: 'JPY', totalMinorUnits: 1500 })).toEqual({
      currency_code: 'JPY',
      value: '1500',
    });
    expect(paypalMoney({ currencyCode: 'UGX', totalMinorUnits: 250000 })).toEqual({
      currency_code: 'UGX',
      value: '250000',
    });
  });

  it('does not lose cents to float rounding', () => {
    expect(paypalMoney({ currencyCode: 'NGN', totalMinorUnits: 1010 }).value).toBe('10.10');
    expect(paypalMoney({ currencyCode: 'NGN', totalMinorUnits: 1055 }).value).toBe('10.55');
  });
});
