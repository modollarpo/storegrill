import { z } from 'zod';

export const OrderStatus = z.enum([
  'PENDING', 'CONFIRMED', 'PAID', 'PROCESSING',
  'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED',
]);

export const PaymentStatus = z.enum([
  'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED',
]);

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  userId: z.string(),
  status: OrderStatus.default('PENDING'),
  regionKey: z.string(),
  currencyCode: z.string().length(3),
  subtotalMinorUnits: z.number().int().nonnegative(),
  taxMinorUnits: z.number().int().nonnegative(),
  shippingMinorUnits: z.number().int().nonnegative(),
  discountMinorUnits: z.number().int().nonnegative().default(0),
  totalMinorUnits: z.number().int().nonnegative(),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string().length(2),
  }),
  billingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string().length(2),
  }).optional(),
  paymentMethod: z.string(),
  paymentId: z.string().optional(),
  paymentStatus: PaymentStatus.default('PENDING'),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const OrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  vendorId: z.string(),
  name: z.string(),
  sku: z.string(),
  image: z.string().url().optional(),
  quantity: z.number().int().positive(),
  unitPriceMinorUnits: z.number().int().nonnegative(),
  totalMinorUnits: z.number().int().nonnegative(),
  taxMinorUnits: z.number().int().nonnegative().default(0),
});

export const ShipmentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  carrier: z.string(),
  trackingNumber: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED']).default('PENDING'),
  estimatedDelivery: z.date().optional(),
  actualDelivery: z.date().optional(),
  shippingAddress: z.record(z.unknown()),
  costMinorUnits: z.number().int().nonnegative(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PaymentSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  method: z.string(),
  providerPaymentId: z.string().optional(),
  amountMinorUnits: z.number().int().nonnegative(),
  currencyCode: z.string().length(3),
  status: PaymentStatus,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export const RefundSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  amountMinorUnits: z.number().int().positive(),
  currencyCode: z.string().length(3),
  reason: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'PROCESSED', 'REJECTED']).default('PENDING'),
  processedAt: z.date().optional(),
  createdAt: z.date(),
});

export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Shipment = z.infer<typeof ShipmentSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Refund = z.infer<typeof RefundSchema>;
export type OrderStatusEnum = z.infer<typeof OrderStatus>;
export type PaymentStatusEnum = z.infer<typeof PaymentStatus>;

export const CheckoutSchema = z.object({
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().length(2),
  }),
  billingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().length(2),
  }).optional(),
  paymentMethod: z.enum(['stripe', 'paypal', 'cod']),
  regionKey: z.string().min(2).max(10).default('US'),
  notes: z.string().max(500).optional(),
  email: z.string().email().optional(),
  couponCode: z.string().max(64).optional(),
});
