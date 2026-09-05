import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { requireMerchantPermission } from '../services/merchant-rbac.js';
import {
  MARKETING_CHANNEL_VALUES,
  MerchantPermission,
  computeMarketingFee,
  MarketingFeeModel,
  type MarketingChannelValue,
  type MarketingFeeModelValue,
} from '@Storegrill/shared';
import {
  computeCommission,
  selectCommissionRule,
  type CommissionInput,
  type CommissionRule as SharedCommissionRule,
} from '@Storegrill/shared';

const router = Router();

router.use(authenticate);

const CHANNEL_ENUM = z.enum(MARKETING_CHANNEL_VALUES as unknown as [MarketingChannelValue, ...MarketingChannelValue[]]);

const PARTICIPATION_SCHEMA = z.object({
  channel: CHANNEL_ENUM,
  enabled: z.boolean().default(true),
  feeModel: z.enum(Object.values(MarketingFeeModel) as unknown as [MarketingFeeModelValue, ...MarketingFeeModelValue[]]),
  fixedFeeMinorUnits: z.number().int().nonnegative().optional(),
  budgetMinorUnits: z.number().int().nonnegative().optional(),
  campaignEligible: z.boolean().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

async function requireVendor(req: AuthRequest, res: Response) {
  if (!req.merchant) {
    res.status(403).json({ error: { code: 'MERCHANT_CONTEXT_REQUIRED', message: 'No active merchant context for this user' } });
    return null;
  }
  const vendor = await prisma.vendorProfile.findUnique({ where: { id: req.merchant.vendorId } });
  if (!vendor) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor profile not found' } });
    return null;
  }
  return vendor;
}

router.get('/participation', requireMerchantPermission(MerchantPermission.MARKETING_OPT_IN), async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req, res);
  if (!vendor) return;

  const rows = await prisma.marketingParticipation.findMany({ where: { vendorId: vendor.id } });
  res.json({ channels: rows.map(r => ({ ...r, fixedFeeMinorUnits: r.fixedFeeMinorUnits != null ? Number(r.fixedFeeMinorUnits) : null, budgetMinorUnits: r.budgetMinorUnits != null ? Number(r.budgetMinorUnits) : null })) });
});

router.put('/participation', requireMerchantPermission(MerchantPermission.MARKETING_OPT_IN), async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req, res);
  if (!vendor) return;

  const body = PARTICIPATION_SCHEMA.parse(req.body);
  const participation = await prisma.marketingParticipation.upsert({
    where: { vendorId_channel: { vendorId: vendor.id, channel: body.channel } },
    update: {
      enabled: body.enabled,
      feeModel: body.feeModel,
      ...(body.fixedFeeMinorUnits !== undefined && { fixedFeeMinorUnits: BigInt(body.fixedFeeMinorUnits) }),
      ...(body.budgetMinorUnits !== undefined && { budgetMinorUnits: BigInt(body.budgetMinorUnits) }),
      ...(body.campaignEligible !== undefined && { campaignEligible: body.campaignEligible }),
      ...(body.startAt && { startAt: new Date(body.startAt) }),
      ...(body.endAt && { endAt: new Date(body.endAt) }),
    },
    create: {
      vendorId: vendor.id,
      channel: body.channel,
      enabled: body.enabled,
      feeModel: body.feeModel,
      fixedFeeMinorUnits: body.fixedFeeMinorUnits != null ? BigInt(body.fixedFeeMinorUnits) : null,
      budgetMinorUnits: body.budgetMinorUnits != null ? BigInt(body.budgetMinorUnits) : null,
      campaignEligible: body.campaignEligible ?? false,
    },
  });

  res.json({ participation: { ...participation, fixedFeeMinorUnits: participation.fixedFeeMinorUnits != null ? Number(participation.fixedFeeMinorUnits) : null, budgetMinorUnits: participation.budgetMinorUnits != null ? Number(participation.budgetMinorUnits) : null } });
});

const PREVIEW_SCHEMA = z.object({
  dealPriceMinorUnits: z.number().int().nonnegative(),
  channel: CHANNEL_ENUM,
});

router.post('/marketing-fee/preview', requireMerchantPermission(MerchantPermission.MARKETING_OPT_IN), async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req, res);
  if (!vendor) return;

  const body = PREVIEW_SCHEMA.parse(req.body);
  const participation = await prisma.marketingParticipation.findUnique({
    where: { vendorId_channel: { vendorId: vendor.id, channel: body.channel } },
  });

  const fee = computeMarketingFee({
    dealPriceMinorUnits: BigInt(body.dealPriceMinorUnits),
    channel: body.channel,
    participation: participation
      ? {
          enabled: participation.enabled,
          feeModel: (participation.feeModel ?? 'NONE') as 'NONE' | 'PRICE_BAND' | 'FIXED',
          fixedFeeMinorUnits: participation.fixedFeeMinorUnits ?? undefined,
        }
      : null,
  });

  res.json({
    fee: {
      ...fee,
      feeMinorUnits: Number(fee.feeMinorUnits),
      appliedBand: fee.appliedBand ? { ...fee.appliedBand, minDealPriceMinorUnits: Number(fee.appliedBand.minDealPriceMinorUnits) } : null,
    },
  });
});

const COMMISSION_PREVIEW_SCHEMA = z.object({
  dealPriceMinorUnits: z.number().int().nonnegative(),
  rrpMinorUnits: z.number().int().nonnegative().optional(),
  shippingMinorUnits: z.number().int().nonnegative().optional(),
  taxMinorUnits: z.number().int().nonnegative().optional(),
  paymentFeeMinorUnits: z.number().int().nonnegative().optional(),
  categoryId: z.string().optional(),
  regionKey: z.string().optional(),
});

router.post('/commission/preview', requireMerchantPermission(MerchantPermission.FINANCE_READ), async (req: AuthRequest, res: Response) => {
  const vendor = await requireVendor(req, res);
  if (!vendor) return;

  const body = COMMISSION_PREVIEW_SCHEMA.parse(req.body);

  const rules = await prisma.commissionRule.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      basis: true,
      rateBps: true,
      minAmountMinorUnits: true,
      maxAmountMinorUnits: true,
      maxRateBps: true,
      vendorId: true,
      categoryId: true,
      regionKey: true,
      priority: true,
      startsAt: true,
      endsAt: true,
    },
  });

  const input: CommissionInput = {
    merchantId: vendor.id,
    regionKey: body.regionKey ?? vendor.warehouseRegionKey ?? 'UK',
    categoryId: body.categoryId,
    dealPriceMinorUnits: BigInt(body.dealPriceMinorUnits),
    rrpMinorUnits: body.rrpMinorUnits != null ? BigInt(body.rrpMinorUnits) : null,
    shippingMinorUnits: body.shippingMinorUnits != null ? BigInt(body.shippingMinorUnits) : null,
    taxMinorUnits: body.taxMinorUnits != null ? BigInt(body.taxMinorUnits) : null,
    paymentFeeMinorUnits: body.paymentFeeMinorUnits != null ? BigInt(body.paymentFeeMinorUnits) : null,
  };

  const sharedRules: SharedCommissionRule[] = rules.map(r => ({
    id: r.id,
    merchantId: r.vendorId,
    regionKey: r.regionKey,
    categoryId: r.categoryId,
    basis: r.basis as SharedCommissionRule['basis'],
    rateBps: r.rateBps,
    minCommissionMinorUnits: r.minAmountMinorUnits,
    maxCommissionMinorUnits: r.maxAmountMinorUnits,
    effectiveFrom: r.startsAt,
    effectiveTo: r.endsAt,
    priority: r.priority,
  }));

  const matched = selectCommissionRule(sharedRules, input);
  const result = matched ? computeCommission(matched, input) : null;

  res.json({
    preview: result
      ? {
          commissionMinorUnits: Number(result.commissionMinorUnits),
          snapshot: {
            ...result.snapshot,
            applicableAmountMinorUnits: Number(result.snapshot.applicableAmountMinorUnits),
            commissionMinorUnits: Number(result.snapshot.commissionMinorUnits),
            minCommissionMinorUnits: result.snapshot.minCommissionMinorUnits != null ? Number(result.snapshot.minCommissionMinorUnits) : null,
            maxCommissionMinorUnits: result.snapshot.maxCommissionMinorUnits != null ? Number(result.snapshot.maxCommissionMinorUnits) : null,
          },
        }
      : null,
  });
});

router.get('/channels', authorize('VENDOR'), async (_req: AuthRequest, res: Response) => {
  const channels = await prisma.marketingChannel.findMany({
    orderBy: { channel: 'asc' },
    select: { channel: true, name: true, enabled: true, defaultFeeModel: true },
  });
  res.json({ channels });
});

export { router as marketingRouter };