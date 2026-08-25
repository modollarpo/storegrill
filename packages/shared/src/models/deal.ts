import { z } from 'zod';

export const DealType = z.enum([
  'PERCENTAGE_OFF', 'FIXED_AMOUNT', 'BOGO', 'BUNDLE', 'FLASH_SALE',
]);

export const DealSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  type: DealType,
  value: z.number().nonnegative(),
  minOrderAmount: z.number().int().nonnegative().optional(),
  maxDiscount: z.number().int().nonnegative().optional(),
  maxUsesPerCustomer: z.number().int().positive().optional(),
  totalUses: z.number().int().positive().optional(),
  usedCount: z.number().int().nonnegative().default(0),
  startsAt: z.date(),
  endsAt: z.date(),
  enabled: z.boolean().default(true),
  regionKey: z.string().optional(),
  vendorId: z.string().optional(),
  categoryIds: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CouponSchema = z.object({
  id: z.string(),
  dealId: z.string(),
  code: z.string().min(3).max(50),
  maxUses: z.number().int().positive().optional(),
  usedCount: z.number().int().nonnegative().default(0),
  expiresAt: z.date().optional(),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
});

export type Deal = z.infer<typeof DealSchema>;
export type Coupon = z.infer<typeof CouponSchema>;
export type DealTypeEnum = z.infer<typeof DealType>;

export const CreateDealSchema = DealSchema.omit({
  id: true, createdAt: true, updatedAt: true, usedCount: true,
});

export const CreateCouponSchema = CouponSchema.omit({
  id: true, createdAt: true, usedCount: true,
});

export const ApplyCouponSchema = z.object({
  code: z.string().min(1),
  regionKey: z.string(),
  subtotalMinorUnits: z.number().int().nonnegative(),
  vendorIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
});

export const DealCalculationResult = z.object({
  dealId: z.string(),
  dealName: z.string(),
  discountMinorUnits: z.number().int().nonnegative(),
  appliedToItems: z.array(z.object({
    orderItemId: z.string(),
    discountMinorUnits: z.number().int().nonnegative(),
  })),
});
