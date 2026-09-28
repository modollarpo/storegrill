import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  paypalMoney,
  paypalUnitAmount,
  initiateStripePayment,
  buildPaypalBreakdown,
  buildStripeCheckoutBody,
  type PaymentOrderContext,
} from './providers.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('initiateStripePayment', () => {
  it('rejects a method the card processor cannot handle instead of charging a card', async () => {
    const base = {
      orderNumber: 'SG-1',
      currencyCode: 'EUR',
      totalMinorUnits: 1000,
      items: [{ name: 'Item', unitPriceMinorUnits: 1000, quantity: 1 }],
    };
    await expect(initiateStripePayment({ ...base, paymentMethod: 'twint' })).rejects.toThrow(
      /not supported/
    );
    await expect(initiateStripePayment({ ...base, paymentMethod: 'bizum' })).rejects.toThrow(
      /not supported/
    );
  });
});

describe('paypalMoney', () => {
  it('formats a two-decimal currency', () => {
    expect(paypalMoney({ currencyCode: 'USD', totalMinorUnits: 1234 })).toEqual({
      currency_code: 'USD',
      value: '12.34',
    });
  });

  it('formats a zero-decimal currency without a fractional part', () => {
    expect(paypalMoney({ currencyCode: 'JPY', totalMinorUnits: 1500 })).toEqual({
      currency_code: 'JPY',
      value: '1500',
    });
  });
});

describe('paypalUnitAmount', () => {
  it('uses the correct decimal places for the currency', () => {
    expect(paypalUnitAmount(599, 'USD')).toEqual({ currency_code: 'USD', value: '5.99' });
    expect(paypalUnitAmount(599, 'JPY')).toEqual({ currency_code: 'JPY', value: '599' });
  });
});

describe('buildPaypalBreakdown', () => {
  // Regression for the live ITEM_TOTAL_MISMATCH: a GBP order of 3 x 124.91 with
  // an 84.94 shipping+tax tail was sent as item_total 459.67 while the items
  // only summed to 374.73.
  const reportedCase: PaymentOrderContext = {
    orderNumber: 'SG-1',
    currencyCode: 'GBP',
    totalMinorUnits: 45967,
    shippingMinorUnits: 4994,
    taxMinorUnits: 3500,
    items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
  };

  it('keeps item_total equal to the sum of unit_amount * quantity', () => {
    const breakdown = buildPaypalBreakdown(reportedCase);
    expect(breakdown.item_total).toEqual({ currency_code: 'GBP', value: '374.73' });

    const itemTotalMinorUnits = reportedCase.items.reduce(
      (sum, item) => sum + item.unitPriceMinorUnits * item.quantity,
      0
    );
    expect(breakdown.item_total.value).toBe((itemTotalMinorUnits / 100).toFixed(2));
  });

  it('declares shipping and tax so the breakdown sums to amount.value', () => {
    const breakdown = buildPaypalBreakdown(reportedCase);
    expect(breakdown.shipping).toEqual({ currency_code: 'GBP', value: '49.94' });
    expect(breakdown.tax_total).toEqual({ currency_code: 'GBP', value: '35.00' });

    const sum =
      Number(breakdown.item_total.value) +
      Number(breakdown.shipping.value) +
      Number(breakdown.tax_total.value);
    expect(sum.toFixed(2)).toBe(paypalMoney(reportedCase).value);
  });

  it('emits the discount as a negative amount', () => {
    const breakdown = buildPaypalBreakdown({
      orderNumber: 'SG-2',
      currencyCode: 'GBP',
      totalMinorUnits: 36473,
      discountMinorUnits: 1000,
      items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
    });
    expect(breakdown.item_total).toEqual({ currency_code: 'GBP', value: '374.73' });
    expect(breakdown.discount).toEqual({ currency_code: 'GBP', value: '-10.00' });
    expect(breakdown.shipping).toBeUndefined();
    expect(breakdown.tax_total).toBeUndefined();
  });

  it('omits zero-value components', () => {
    const breakdown = buildPaypalBreakdown({
      orderNumber: 'SG-3',
      currencyCode: 'GBP',
      totalMinorUnits: 37473,
      shippingMinorUnits: 0,
      taxMinorUnits: 0,
      discountMinorUnits: 0,
      items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
    });
    expect(breakdown).toEqual({ item_total: { currency_code: 'GBP', value: '374.73' } });
  });

  it('rejects an order whose components do not reconcile to the total', () => {
    expect(() =>
      buildPaypalBreakdown({
        orderNumber: 'SG-4',
        currencyCode: 'GBP',
        totalMinorUnits: 50000,
        items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
      })
    ).toThrow(/does not reconcile/);
  });
});

describe('buildStripeCheckoutBody', () => {
  // Same reported live case as the PayPal breakdown: 3 x 124.91 products, 49.94
  // shipping, 35.00 tax, 459.67 total. Stripe must charge the full total, not
  // just the 374.73 the product line items sum to.
  const reportedCase: PaymentOrderContext = {
    orderNumber: 'SG-1',
    currencyCode: 'GBP',
    totalMinorUnits: 45967,
    shippingMinorUnits: 4994,
    taxMinorUnits: 3500,
    paymentMethod: 'card',
    items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
  };

  it('prices the session from line items plus tax and shipping', () => {
    const body = buildStripeCheckoutBody(reportedCase);
    expect(body['line_items[0][price_data][currency]']).toBe('gbp');
    expect(body['line_items[0][price_data][unit_amount]']).toBe(12491);
    expect(body['line_items[0][quantity]']).toBe(3);
    expect(body['line_items[1][price_data][unit_amount]']).toBe(3500);
    expect(body['line_items[1][price_data][product_data][name]']).toBe('Tax');
    expect(body['shipping_options[0][shipping_rate_data][fixed_amount][amount]']).toBe(4994);
    expect(body['shipping_options[0][shipping_rate_data][fixed_amount][currency]']).toBe('gbp');

    const items = 12491 * 3;
    const tax = Number(body['line_items[1][price_data][unit_amount]']);
    const shipping = Number(body['shipping_options[0][shipping_rate_data][fixed_amount][amount]']);
    expect(items + tax + shipping).toBe(45967);
  });

  it('omits tax and shipping when there are none', () => {
    const body = buildStripeCheckoutBody({
      orderNumber: 'SG-3',
      currencyCode: 'GBP',
      totalMinorUnits: 37473,
      shippingMinorUnits: 0,
      taxMinorUnits: 0,
      paymentMethod: 'card',
      items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
    });
    expect(body['line_items[0][price_data][unit_amount]']).toBe(12491);
    expect(body['line_items[1][price_data][unit_amount]']).toBeUndefined();
    expect(body['shipping_options[0][shipping_rate_data][fixed_amount][amount]']).toBeUndefined();
  });

  it('rejects an order that does not reconcile', () => {
    expect(() =>
      buildStripeCheckoutBody({
        orderNumber: 'SG-4',
        currencyCode: 'GBP',
        totalMinorUnits: 50000,
        paymentMethod: 'card',
        items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
      })
    ).toThrow(/does not reconcile/);
  });
});

describe('initiateStripePayment with a discount', () => {
  it('creates a coupon and applies it to the checkout session', async () => {
    const originalKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';

    const calls: Array<{ url: string; body?: string }> = [];
    const fetchMock = vi.fn(async (url: unknown, init?: { body?: unknown }) => {
      const href = String(url);
      const rawBody =
        typeof init?.body === 'string' ? init.body : new URLSearchParams(init?.body as string).toString();
      calls.push({ url: href, body: rawBody });
      if (href.includes('/coupons')) {
        return { ok: true, status: 200, json: async () => ({ id: 'coupon_1' }) };
      }
      if (href.includes('/checkout/sessions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await initiateStripePayment({
        orderNumber: 'SG-5',
        currencyCode: 'GBP',
        totalMinorUnits: 36473,
        discountMinorUnits: 1000,
        paymentMethod: 'card',
        items: [{ name: 'Item', unitPriceMinorUnits: 12491, quantity: 3 }],
      });

      expect(result.status).toBe('REQUIRES_REDIRECT');
      expect(result.providerPaymentId).toBe('cs_test_1');
      expect(result.redirectUrl).toBe('https://checkout.stripe.com/c/pay/cs_test_1');

      const couponCall = calls.find(c => c.url.includes('/coupons'));
      const couponParams = new URLSearchParams(couponCall!.body);
      expect(couponParams.get('amount_off')).toBe('1000');
      expect(couponParams.get('duration')).toBe('once');
      expect(couponParams.get('currency')).toBe('gbp');

      const sessionCall = calls.find(c => c.url.includes('/checkout/sessions'));
      const sessionParams = new URLSearchParams(sessionCall!.body);
      expect(sessionParams.get('discounts[0][coupon]')).toBe('coupon_1');
      expect(sessionParams.get('line_items[0][price_data][unit_amount]')).toBe('12491');
    } finally {
      process.env.STRIPE_SECRET_KEY = originalKey;
    }
  });
});
