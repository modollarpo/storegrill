import crypto from 'node:crypto';
import { getCurrencyDecimals, stripePaymentMethodType } from '@Storegrill/shared';

export interface PaymentOrderContext {
  orderNumber: string;
  currencyCode: string;
  totalMinorUnits: number;
  items: Array<{ name: string; unitPriceMinorUnits: number; quantity: number }>;
  /**
   * Components of totalMinorUnits that are not part of the line items. PayPal
   * requires item_total to equal the sum of unit_amount * quantity, so anything
   * else in the total has to be declared in the breakdown or the order is
   * rejected with ITEM_TOTAL_MISMATCH.
   */
  shippingMinorUnits?: number;
  taxMinorUnits?: number;
  discountMinorUnits?: number;
  customerEmail?: string;
  paymentMethod?: string;
}

export interface PaymentInitResult {
  provider: 'stripe' | 'paypal' | 'cod';
  mode: 'live' | 'sandbox';
  providerPaymentId: string;
  status: 'CAPTURED' | 'REQUIRES_REDIRECT';
  redirectUrl?: string;
}

const STRIPE_API = 'https://api.stripe.com/v1';
const PAYPAL_API = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

function webBaseUrl(): string {
  return process.env.WEB_BASE_URL || 'http://localhost:3000';
}

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function formEncode(data: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params.append(key, String(value));
  }
  return params.toString();
}

async function stripeRequest(path: string, method: string, body?: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body,
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new Error(err?.message || `Stripe request failed (${res.status})`);
  }
  return data;
}

async function paypalToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = (await res.json()) as { access_token?: string };
  if (!res.ok || !data.access_token) throw new Error('PayPal authentication failed');
  return data.access_token;
}

export function paypalMoney(ctx: { currencyCode: string; totalMinorUnits: number }): { currency_code: string; value: string } {
  const decimals = getCurrencyDecimals(ctx.currencyCode);
  const divisor = 10 ** decimals;
  return {
    currency_code: ctx.currencyCode,
    value: (ctx.totalMinorUnits / divisor).toFixed(decimals),
  };
}

export function paypalUnitAmount(minorUnits: number, currencyCode: string): { currency_code: string; value: string } {
  const decimals = getCurrencyDecimals(currencyCode);
  const divisor = 10 ** decimals;
  return {
    currency_code: currencyCode,
    value: (minorUnits / divisor).toFixed(decimals),
  };
}

/**
 * Validates that the parts of an order add up to its total and returns them.
 *
 * The provider line items only carry the pre-discount subtotal while the order
 * total also includes shipping and tax and is reduced by discounts. Both
 * providers have to reconstruct the total from these parts, so the check is
 * shared here and throws before any provider call.
 */
export function reconcileOrderTotal(
  ctx: PaymentOrderContext
): { itemTotal: number; shipping: number; tax: number; discount: number } {
  const itemTotal = ctx.items.reduce(
    (sum, item) => sum + item.unitPriceMinorUnits * item.quantity,
    0
  );
  const shipping = ctx.shippingMinorUnits ?? 0;
  const tax = ctx.taxMinorUnits ?? 0;
  const discount = ctx.discountMinorUnits ?? 0;
  const reconciled = itemTotal + shipping + tax - discount;
  if (reconciled !== ctx.totalMinorUnits) {
    throw new Error(
      'Order amount does not reconcile to the total: ' +
        `items ${itemTotal} + shipping ${shipping} + tax ${tax} - discount ${discount} ` +
        `= ${reconciled}, but totalMinorUnits is ${ctx.totalMinorUnits}`
    );
  }
  return { itemTotal, shipping, tax, discount };
}

/**
 * Builds the PayPal `breakdown` for a purchase unit.
 *
 * PayPal requires item_total to equal the sum of unit_amount * quantity and the
 * parts of the breakdown to add up to amount.value, so item_total is always
 * derived from the line items and shipping/tax/discount are declared explicitly
 * (discounts must be sent as a negative amount).
 */
export function buildPaypalBreakdown(
  ctx: PaymentOrderContext
): Record<string, { currency_code: string; value: string }> {
  const { itemTotal, shipping, tax, discount } = reconcileOrderTotal(ctx);

  const money = (minorUnits: number) =>
    paypalMoney({ currencyCode: ctx.currencyCode, totalMinorUnits: minorUnits });

  const breakdown: Record<string, { currency_code: string; value: string }> = {
    item_total: money(itemTotal),
  };
  if (shipping > 0) breakdown.shipping = money(shipping);
  if (tax > 0) breakdown.tax_total = money(tax);
  if (discount > 0) breakdown.discount = money(-discount);

  return breakdown;
}

function stripeCurrencyCode(currencyCode: string): string {
  return currencyCode.toLowerCase();
}

/**
 * Builds the Stripe Checkout Session body for an order.
 *
 * Stripe prices a session from the line items it is given, so unlike PayPal it
 * does not reject a mismatch — it just charges the wrong amount. Shipping is
 * declared as a fixed-amount shipping option, tax as an extra line item, and the
 * shared reconcile guard ensures the session amount equals the order total.
 * Discounts are applied via a coupon created by the caller.
 */
export function buildStripeCheckoutBody(ctx: PaymentOrderContext): Record<string, string | number> {
  const stripeType = stripePaymentMethodType(ctx.paymentMethod ?? 'card');
  if (!stripeType) {
    throw new Error(`Payment method "${ctx.paymentMethod}" is not supported by the card processor`);
  }
  const { shipping, tax } = reconcileOrderTotal(ctx);

  const body: Record<string, string | number> = {
    mode: 'payment',
    success_url: `${webBaseUrl()}/checkout/confirmation?order=${encodeURIComponent(ctx.orderNumber)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${webBaseUrl()}/checkout?cancelled=1`,
    'payment_method_types[0]': stripeType,
    client_reference_id: ctx.orderNumber,
  };
  if (ctx.customerEmail) body.customer_email = ctx.customerEmail;

  ctx.items.forEach((item, i) => {
    body[`line_items[${i}][price_data][currency]`] = stripeCurrencyCode(ctx.currencyCode);
    body[`line_items[${i}][price_data][unit_amount]`] = item.unitPriceMinorUnits;
    body[`line_items[${i}][quantity]`] = item.quantity;
    body[`line_items[${i}][price_data][product_data][name]`] = item.name.slice(0, 120);
  });

  if (tax > 0) {
    const i = ctx.items.length;
    body[`line_items[${i}][price_data][currency]`] = stripeCurrencyCode(ctx.currencyCode);
    body[`line_items[${i}][price_data][unit_amount]`] = tax;
    body[`line_items[${i}][quantity]`] = 1;
    body[`line_items[${i}][price_data][product_data][name]`] = 'Tax';
  }

  if (shipping > 0) {
    body['shipping_options[0][shipping_rate_data][type]'] = 'fixed_amount';
    body['shipping_options[0][shipping_rate_data][fixed_amount][amount]'] = shipping;
    body['shipping_options[0][shipping_rate_data][fixed_amount][currency]'] = stripeCurrencyCode(ctx.currencyCode);
    body['shipping_options[0][shipping_rate_data][display_name]'] = 'Shipping';
  }

  return body;
}

export async function initiateStripePayment(ctx: PaymentOrderContext): Promise<PaymentInitResult> {
  const stripeType = stripePaymentMethodType(ctx.paymentMethod ?? 'card');
  if (!stripeType) {
    throw new Error(`Payment method "${ctx.paymentMethod}" is not supported by the card processor`);
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      provider: 'stripe',
      mode: 'sandbox',
      providerPaymentId: randomId('sbx_stripe'),
      status: 'CAPTURED',
    };
  }

  const body = buildStripeCheckoutBody(ctx);

  const discount = ctx.discountMinorUnits ?? 0;
  if (discount > 0) {
    const coupon = await stripeRequest(
      '/coupons',
      'POST',
      formEncode({
        amount_off: discount,
        currency: stripeCurrencyCode(ctx.currencyCode),
        duration: 'once',
        name: 'Store discount',
      })
    );
    if (!coupon.id) throw new Error('Stripe coupon creation returned no id');
    body['discounts[0][coupon]'] = String(coupon.id);
  }

  const session = await stripeRequest('/checkout/sessions', 'POST', formEncode(body));
  return {
    provider: 'stripe',
    mode: 'live',
    providerPaymentId: String(session.id),
    status: 'REQUIRES_REDIRECT',
    redirectUrl: String(session.url),
  };
}

export async function retrieveStripeSession(sessionId: string): Promise<{ paid: boolean; orderNumber: string | null }> {
  const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`, 'GET');
  return {
    paid: session.payment_status === 'paid',
    orderNumber: (session.client_reference_id as string) || null,
  };
}

export function verifyStripeSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(part => part.split('=') as [string, string])
  );
  if (!parts.t || !parts.v1) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.t}.${rawBody.toString('utf8')}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

export async function initiatePaypalPayment(ctx: PaymentOrderContext): Promise<PaymentInitResult> {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return {
      provider: 'paypal',
      mode: 'sandbox',
      providerPaymentId: randomId('sbx_paypal'),
      status: 'CAPTURED',
    };
  }

  const token = await paypalToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: ctx.orderNumber,
          custom_id: ctx.orderNumber,
          amount: {
            ...paypalMoney(ctx),
            breakdown: buildPaypalBreakdown(ctx),
          },
          items: ctx.items.map(item => ({
            name: item.name.slice(0, 127),
            quantity: String(item.quantity),
            unit_amount: paypalUnitAmount(item.unitPriceMinorUnits, ctx.currencyCode),
          })),
        },
      ],
    }),
  });
  const data = (await res.json()) as {
    id?: string;
    links?: Array<{ rel: string; href: string }>;
    message?: string;
  };
  if (!res.ok || !data.id) throw new Error(data.message || 'PayPal order creation failed');

  const approve = data.links?.find(l => l.rel === 'approve')?.href;
  if (!approve) throw new Error('PayPal approval link missing');
  return {
    provider: 'paypal',
    mode: 'live',
    providerPaymentId: data.id,
    status: 'REQUIRES_REDIRECT',
    redirectUrl: approve,
  };
}

export async function capturePaypalOrder(paypalOrderId: string): Promise<{ completed: boolean; orderNumber: string | null }> {
  const token = await paypalToken();
  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = (await res.json()) as {
    status?: string;
    purchase_units?: Array<{ reference_id?: string; custom_id?: string }>;
  };
  if (!res.ok && data.status !== 'COMPLETED') {
    const alreadyCaptured = res.status === 422;
    if (!alreadyCaptured) throw new Error('PayPal capture failed');
  }
  const unit = data.purchase_units?.[0];
  return {
    completed: data.status === 'COMPLETED',
    orderNumber: unit?.custom_id || unit?.reference_id || null,
  };
}

export interface PaypalWebhookHeaders {
  transmissionId: string | undefined;
  transmissionTime: string | undefined;
  certUrl: string | undefined;
  authAlgo: string | undefined;
  transmissionSig: string | undefined;
}

export async function verifyPaypalWebhook(
  rawBody: Buffer,
  headers: PaypalWebhookHeaders
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return true; // skip verification in dev when env var not set

  const { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig } = headers;
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;

  try {
    const token = await paypalToken();
    const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody.toString('utf8')),
      }),
    });
    const data = (await res.json()) as { verification_status?: string };
    return data.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}
