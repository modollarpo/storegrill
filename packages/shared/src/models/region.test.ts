import { describe, it, expect } from 'vitest';
import { isPaymentMethodSupported, stripePaymentMethodType, providerFor } from './region.js';

describe('stripePaymentMethodType', () => {
  it('maps methods Stripe can actually process', () => {
    expect(stripePaymentMethodType('card')).toBe('card');
    expect(stripePaymentMethodType('klarna')).toBe('klarna');
    expect(stripePaymentMethodType('afterpay')).toBe('afterpay_clearpay');
    expect(stripePaymentMethodType('ideal')).toBe('ideal');
  });

  it('returns null rather than defaulting to card', () => {
    expect(stripePaymentMethodType('twint')).toBeNull();
    expect(stripePaymentMethodType('bizum')).toBeNull();
    expect(stripePaymentMethodType('mbway')).toBeNull();
    expect(stripePaymentMethodType('multibanco')).toBeNull();
    expect(stripePaymentMethodType('przelewy24')).toBeNull();
    expect(stripePaymentMethodType('mobilepay')).toBeNull();
    expect(stripePaymentMethodType('konbini')).toBeNull();
  });
});

describe('isPaymentMethodSupported', () => {
  it('accepts the methods the configured providers handle', () => {
    expect(isPaymentMethodSupported('card')).toBe(true);
    expect(isPaymentMethodSupported('paypal')).toBe(true);
    expect(isPaymentMethodSupported('cod')).toBe(true);
    expect(isPaymentMethodSupported('ideal')).toBe(true);
  });

  it('rejects methods no configured provider can process', () => {
    expect(isPaymentMethodSupported('twint')).toBe(false);
    expect(isPaymentMethodSupported('konbini')).toBe(false);
  });

  it('does not treat an unknown method as a card charge', () => {
    expect(providerFor('not-a-method')).toBe('stripe');
    expect(isPaymentMethodSupported('not-a-method')).toBe(false);
  });
});
