import { z } from 'zod';

export const CartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
  addedAt: z.date(),
});

export const CartSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(CartItemSchema).default([]),
  updatedAt: z.date(),
});

export type Cart = z.infer<typeof CartSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;

export const AddToCartSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export const CartSummarySchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    productId: z.string(),
    variantId: z.string().optional(),
    name: z.string(),
    image: z.string().url().optional(),
    unitPriceMinorUnits: z.number().int().nonnegative(),
    quantity: z.number().int().positive(),
    lineTotalMinorUnits: z.number().int().nonnegative(),
    vendorId: z.string(),
    vendorName: z.string(),
    inStock: z.boolean(),
  })),
  subtotalMinorUnits: z.number().int().nonnegative(),
  taxMinorUnits: z.number().int().nonnegative(),
  shippingMinorUnits: z.number().int().nonnegative(),
  discountMinorUnits: z.number().int().nonnegative(),
  totalMinorUnits: z.number().int().nonnegative(),
  currencyCode: z.string().length(3),
});
