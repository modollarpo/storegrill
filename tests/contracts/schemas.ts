import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  price: z.number().min(0),
  listPrice: z.number().min(0).optional(),
  currencyCode: z.string().length(3),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().min(0),
  inventoryCount: z.number().min(0).optional(),
  vendor: z.object({
    id: z.string(),
    storeName: z.string(),
    slug: z.string(),
    verified: z.boolean().optional(),
  }).nullable().optional(),
  category: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }).nullable().optional(),
});

export const ProductListResponseSchema = z.object({
  products: z.array(ProductSchema),
  pagination: z.object({
    page: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const ReviewSchema = z.object({
  id: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  images: z.string(),
  verified: z.boolean(),
  helpfulCount: z.number().min(0),
  vendorReply: z.string().nullable().optional(),
  createdAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().nullable().optional(),
  }),
});

export const ReviewListResponseSchema = z.object({
  reviews: z.array(ReviewSchema),
  stats: z.object({
    average: z.number(),
    total: z.number(),
    distribution: z.array(z.object({
      rating: z.number(),
      count: z.number(),
    })),
  }),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const OrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: z.string(),
  createdAt: z.string(),
  totalMinorUnits: z.number(),
  currencyCode: z.string().length(3),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number().min(1),
    product: z.object({
      thumbnail: z.string().optional(),
    }).optional(),
  })),
});

export const OrderListResponseSchema = z.object({
  orders: z.array(OrderSchema),
});

export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
