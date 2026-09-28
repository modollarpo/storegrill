import type { Address } from './address';
import { z } from 'zod';
import { GuestCheckoutSchema } from '../models/order';
import type { PaymentMethodId } from '../models/region';

export interface BuildCheckoutInput {
  address: Address;
  paymentMethod: PaymentMethodId;
  regionKey: string;
  language: string;
  email: string;
  createAccount: boolean;
  accountName: string;
  accountPassword: string;
  saveAddress: boolean;
  notes: string;
  couponCode?: string;
}

/** The body the API's guest schema accepts, enforced at compile time. */
export type CheckoutWireBody = z.input<typeof GuestCheckoutSchema>;

/**
 * Builds the `/api/v1/orders/checkout` body.
 *
 * The API resolves a payment method to its provider server-side, so the wire
 * value is the region method id (`card`, `paypal`, `cod`, ...). Sending the
 * provider name here instead (`stripe`) is silently wrong: the schema rejects
 * it, and because the request is a POST the shopper only ever saw a generic
 * failure. `buildCheckoutPayload.test.ts` pins the contract against the real
 * schema so the two cannot drift apart again.
 */
export function buildCheckoutPayload(input: BuildCheckoutInput): CheckoutWireBody {
  const payload: CheckoutWireBody = {
    shippingAddress: {
      street: input.address.street,
      line2: input.address.line2,
      city: input.address.city,
      state: input.address.state,
      zip: input.address.zip,
      country: input.address.country,
    },
    paymentMethod: input.paymentMethod,
    regionKey: input.regionKey,
    email: input.email,
    notes: `language=${input.language};displayMethod=${input.paymentMethod};notes=${input.notes}`,
  };

  if (input.couponCode) payload.couponCode = input.couponCode;
  if (input.createAccount) {
    payload.createAccount = true;
    payload.name = input.accountName;
    payload.password = input.accountPassword;
  }
  if (input.saveAddress) payload.saveAddress = true;

  return payload;
}
