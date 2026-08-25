import { z } from 'zod';

export const VendorStatus = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'BANNED']);
export const KycStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const StorefrontSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  regionKey: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  banner: z.string().url().optional(),
  enabled: z.boolean().default(true),
});

export const PayoutSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  amountMinorUnits: z.number().int().nonnegative(),
  currencyCode: z.string().length(3),
  status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED']).default('PENDING'),
  period: z.string(),
  processedAt: z.date().optional(),
  createdAt: z.date(),
});

export const PayoutLineSchema = z.object({
  id: z.string(),
  payoutId: z.string(),
  orderItemId: z.string(),
  amount: z.number().int().nonnegative(),
  commission: z.number().int().nonnegative(),
});

export type Storefront = z.infer<typeof StorefrontSchema>;
export type Payout = z.infer<typeof PayoutSchema>;
export type PayoutLine = z.infer<typeof PayoutLineSchema>;
export type VendorStatusEnum = z.infer<typeof VendorStatus>;
export type KycStatusEnum = z.infer<typeof KycStatus>;

export const VendorOnboardingSchema = z.object({
  storeName: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  returnPolicy: z.string().max(2000).optional(),
  shippingPolicy: z.string().max(2000).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  payoutMethod: z.object({
    type: z.enum(['bank', 'paypal']),
    bankName: z.string().optional(),
    accountLast4: z.string().length(4).optional(),
    paypalEmail: z.string().email().optional(),
  }),
  kycData: z.object({
    businessName: z.string().optional(),
    businessType: z.enum(['individual', 'company']).optional(),
    taxId: z.string().optional(),
    address: z.object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().length(2),
    }).optional(),
  }).optional(),
});

export const UpdateVendorSchema = z.object({
  storeName: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  returnPolicy: z.string().max(2000).optional(),
  shippingPolicy: z.string().max(2000).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
});

const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(v => (v === '' || v === null ? undefined : v), schema.optional());

export const VendorBusinessStepSchema = z.object({
  businessLegalName: z.string().min(2).max(200),
  businessType: z.enum(['individual', 'company']),
  registrationNumber: z.string().min(3).max(60),
  taxId: emptyToUndef(z.string().max(60)),
  countryOfRegistration: z.string().length(2),
  website: emptyToUndef(z.string().max(300)),
});

export const VendorStoreStepSchema = z.object({
  storeName: z.string().min(2).max(100),
  description: z.string().min(20).max(2000),
  supportEmail: z.string().email(),
  supportPhone: emptyToUndef(z.string().min(5).max(30)),
  returnPolicy: emptyToUndef(z.string().min(10).max(2000)),
  shippingPolicy: emptyToUndef(z.string().min(10).max(2000)),
});

export const VendorOperationsStepSchema = z.object({
  warehouseRegionKey: z.string().min(2).max(3),
  plannedCategories: z.array(z.string().min(1).max(80)).min(1).max(10),
});

export const VendorPayoutStepSchema = z.object({
  payoutMethod: z
    .discriminatedUnion('type', [
      z.object({
        type: z.literal('bank'),
        bankName: z.string().min(2).max(120),
        accountLast4: z.string().length(4),
      }),
      z.object({
        type: z.literal('paypal'),
        paypalEmail: z.string().email(),
      }),
    ]),
  acceptTerms: z.literal(true),
});

export const VendorPayoutPatchSchema = z.object({
  type: z.enum(['bank', 'paypal']).optional(),
  bankName: z.string().min(2).max(120).optional(),
  accountLast4: z.string().length(4).optional(),
  paypalEmail: z.string().email().optional(),
  acceptTerms: z.boolean().optional(),
});

export const VendorApplySchema = VendorBusinessStepSchema.merge(VendorStoreStepSchema)
  .merge(VendorOperationsStepSchema)
  .merge(z.object({ payoutMethod: VendorPayoutStepSchema.shape.payoutMethod }));

export const VendorApplicationPatchSchema = z.object({
  step: z.number().int().min(0).max(4),
  business: VendorBusinessStepSchema.partial().optional(),
  store: VendorStoreStepSchema.partial().optional(),
  operations: VendorOperationsStepSchema.partial().optional(),
  payout: VendorPayoutPatchSchema.optional(),
}).refine(
  data => Object.values(data).some(v => v !== undefined && v !== null && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0)),
  { message: 'At least one field must be provided' },
);

export type VendorApplyInput = z.infer<typeof VendorApplySchema>;
export type VendorApplicationPatch = z.infer<typeof VendorApplicationPatchSchema>;
