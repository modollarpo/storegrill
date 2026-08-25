import { z } from 'zod';

export const ProductStatus = z.enum([
  'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'ARCHIVED',
]);

export const ProductSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  name: z.string().min(1).max(500),
  slug: z.string(),
  description: z.string(),
  shortDescription: z.string().max(500).optional(),
  sku: z.string().min(1),
  barcode: z.string().optional(),
  categoryId: z.string(),
  brandId: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  thumbnail: z.string().url().optional(),
  basePriceMinorUnits: z.number().int().nonnegative(),
  currencyCode: z.string().length(3).default('USD'),
  weightGrams: z.number().int().positive().optional(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    unit: z.enum(['cm', 'in']).default('cm'),
  }).optional(),
  status: ProductStatus.default('DRAFT'),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
  totalSales: z.number().int().nonnegative().default(0),
  tags: z.array(z.string()).default([]),
  attributes: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProductVariantSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string().optional(),
  basePriceMinorUnits: z.number().int().nonnegative(),
  currencyCode: z.string().length(3).default('USD'),
  images: z.array(z.string()).default([]),
  attributes: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).default([]),
  stock: z.number().int().nonnegative().default(0),
  weightGrams: z.number().int().positive().optional(),
});

export const ProductRegionPriceSchema = z.object({
  id: z.string(),
  productId: z.string(),
  regionKey: z.string(),
  priceMinorUnits: z.number().int().nonnegative(),
  currencyCode: z.string().length(3),
});

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  parentId: z.string().nullable().optional(),
  image: z.string().url().optional(),
});

export const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().url().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductRegionPrice = z.infer<typeof ProductRegionPriceSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Brand = z.infer<typeof BrandSchema>;
export type ProductStatusEnum = z.infer<typeof ProductStatus>;

export const CreateProductSchema = ProductSchema.omit({
  id: true, createdAt: true, updatedAt: true, rating: true,
  reviewCount: true, totalSales: true,
});

export const UpdateProductSchema = CreateProductSchema.partial();
