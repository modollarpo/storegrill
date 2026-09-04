import { z } from 'zod';

export const Role = z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: Role.default('CUSTOMER'),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CustomerProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  preferredRegionKey: z.string().default('US'),
  defaultCurrency: z.string().length(3).default('USD'),
  defaultLanguage: z.string().default('en'),
  shippingAddresses: z.array(z.object({
    id: z.string(),
    label: z.string().default('Home'),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    country: z.string().length(2),
    isDefault: z.boolean().default(false),
  })).default([]),
});

export const VendorProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  storeName: z.string().min(1),
  slug: z.string(),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  returnPolicy: z.string().optional(),
  shippingPolicy: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  kycStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  payoutMethod: z.object({
    type: z.enum(['bank', 'paypal']),
    bankName: z.string().optional(),
    accountLast4: z.string().optional(),
    paypalEmail: z.string().email().optional(),
  }).optional(),
  revenueSharePct: z.number().min(0).max(100).default(15),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED']).default('PENDING'),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
  regionKey: z.string().optional(),
  warehouseRegionKey: z.string().optional(),
  servingRegions: z.array(z.string()).min(1).default(['UK']),
  corridor: z.boolean().default(false),
  shippingMode: z.enum(['REGION', 'FLAT']).default('REGION'),
  shippingFlatMinorUnits: z.number().int().nonnegative().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
export type RoleEnum = z.infer<typeof Role>;
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;
export type VendorProfile = z.infer<typeof VendorProfileSchema>;

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  role: Role.default('CUSTOMER'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
});
