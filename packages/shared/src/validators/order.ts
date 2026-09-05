import { z } from 'zod';
import { CheckoutSchema } from '../models/order';

export { CheckoutSchema };
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export const OrderFilterSchema = z.object({
  status: z.enum([
    'PENDING', 'CONFIRMED', 'PAID', 'PROCESSING',
    'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED',
  ]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RefundRequestSchema = z.object({
  orderId: z.string(),
  amountMinorUnits: z.number().int().positive().optional(),
  reason: z.string().min(10).max(1000),
});

export const ShipmentCreateSchema = z.object({
  orderId: z.string(),
  carrier: z.string().min(1).max(100),
  trackingNumber: z.string().max(200).optional(),
  estimatedDelivery: z.coerce.date().optional(),
  shippingAddress: z.record(z.unknown()).optional(),
  costMinorUnits: z.number().int().nonnegative(),
});

export const ShipmentUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED']).optional(),
  trackingNumber: z.string().max(200).optional(),
  actualDelivery: z.coerce.date().optional(),
});

export type OrderFilterInput = z.infer<typeof OrderFilterSchema>;
export type RefundRequestInput = z.infer<typeof RefundRequestSchema>;
export type ShipmentCreateInput = z.infer<typeof ShipmentCreateSchema>;
export type ShipmentUpdateInput = z.infer<typeof ShipmentUpdateSchema>;
