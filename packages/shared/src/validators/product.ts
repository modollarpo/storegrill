import { z } from 'zod';

export const ProductFilterSchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  vendorId: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating', 'newest', 'popular']).default('popular'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  regionKey: z.string().default('US'),
});

export const ProductCreateSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().min(1),
  shortDescription: z.string().max(500).optional(),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional(),
  categoryId: z.string(),
  brandId: z.string().optional(),
  images: z.array(z.string().url()).max(20).default([]),
  thumbnail: z.string().url().optional(),
  basePriceMinorUnits: z.number().int().nonnegative(),
  currencyCode: z.string().length(3).default('USD'),
  weightGrams: z.number().int().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(['cm', 'in']).default('cm'),
  }).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  attributes: z.array(z.object({
    name: z.string().max(100),
    value: z.string().max(200),
  })).max(20).default([]),
  variants: z.array(z.object({
    name: z.string().min(1).max(200),
    sku: z.string().min(1).max(100),
    barcode: z.string().max(100).optional(),
    basePriceMinorUnits: z.number().int().nonnegative(),
    images: z.array(z.string().url()).default([]),
    attributes: z.array(z.object({
      name: z.string().max(100),
      value: z.string().max(200),
    })).default([]),
    stock: z.number().int().nonnegative().default(0),
    weightGrams: z.number().int().positive().optional(),
  })).max(50).default([]),
  regionPrices: z.array(z.object({
    regionKey: z.string(),
    priceMinorUnits: z.number().int().nonnegative(),
    currencyCode: z.string().length(3),
  })).default([]),
  status: z.enum(['DRAFT', 'PENDING_REVIEW']).default('DRAFT'),
});

export const ProductUpdateSchema = ProductCreateSchema.partial();
