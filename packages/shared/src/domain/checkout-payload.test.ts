import { describe, it, expect } from 'vitest';
import { CheckoutSchema } from '../models/order';
import { buildCheckoutPayload, type BuildCheckoutInput } from './checkout-payload';
import type { Address } from './address';

const ADDRESS: Address = {
  label: 'Home',
  street: '10 Downing Street',
  line2: 'Flat 4',
  city: 'London',
  state: 'Greater London',
  zip: 'SW1A 2AA',
  country: 'GB',
  isDefault: false,
};

function input(overrides: Partial<BuildCheckoutInput> = {}): BuildCheckoutInput {
  return {
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
  };
}

describe('buildCheckoutPayload', () => {
  it('produces a body the API accepts for every supported payment method', () => {
    for (const method of ['card', 'paypal', 'cod', 'ideal', 'klarna', 'sepa_debit', 'afterpay']) {
      const parsed = CheckoutSchema.safeParse(buildCheckoutPayload(input({ paymentMethod: method })));
      expect(parsed.success, `payment method "${method}" was rejected: ${parsed.error?.message}`).toBe(
        true
      );
    }
  });

  it('sends the method id, not the provider name', () => {
    const payload = buildCheckoutPayload(input({ paymentMethod: 'card' }));
    expect(payload.paymentMethod).toBe('card');
    expect(payload.paymentMethod).not.toBe('stripe');
  });

  it('rejects a provider name, which is how checkout was broken', () => {
    // The provider name is not a valid method id, so the API answers 400.
    expect(CheckoutSchema.safeParse(buildCheckoutPayload(input({ paymentMethod: 'stripe' }))).success).toBe(
      false
    );
  });

  it('carries the full address including the apartment line', () => {
    const parsed = CheckoutSchema.parse(buildCheckoutPayload(input()));
    expect(parsed.shippingAddress).toEqual({
      street: '10 Downing Street',
      line2: 'Flat 4',
      city: 'London',
      state: 'Greater London',
      zip: 'SW1A 2AA',
      country: 'GB',
    });
  });

  it('omits account fields unless an account is being created', () => {
    const plain = buildCheckoutPayload(input());
    expect(plain).not.toHaveProperty('createAccount');
    expect(plain).not.toHaveProperty('password');
    expect(plain).not.toHaveProperty('saveAddress');

    const withAccount = buildCheckoutPayload(
      input({ createAccount: true, accountName: 'Ada', accountPassword: 'correct-horse' })
    );
    expect(withAccount.createAccount).toBe(true);
    expect(withAccount.name).toBe('Ada');
    expect(withAccount.password).toBe('correct-horse');
  });

  it('records the display method and language in the notes field', () => {
    const payload = buildCheckoutPayload(input({ paymentMethod: 'paypal', language: 'fr' }));
    expect(payload.notes).toContain('language=fr');
    expect(payload.notes).toContain('displayMethod=paypal');
  });

  it('omits an empty coupon instead of sending a blank one', () => {
    expect(buildCheckoutPayload(input())).not.toHaveProperty('couponCode');
    expect(buildCheckoutPayload(input({ couponCode: 'SAVE10' })).couponCode).toBe('SAVE10');
  });
});
