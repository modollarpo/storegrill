import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { calculateGroupedShipping, VendorShippingPolicy, ShippingZone } from '@Storegrill/shared';
import { DEFAULT_REGIONS } from '@Storegrill/shared';

const router = Router();

router.post('/rates', async (req: Request, res: Response) => {
  const body = z.object({
    regionKey: z.string().default('UK'),
    country: z.string().default('GB'),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    }))
  }).parse(req.body);

  const regionConfig = DEFAULT_REGIONS.find(r => r.key === body.regionKey) || DEFAULT_REGIONS[0];
  
  const productIds = body.items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, vendorId: true, weightGrams: true, basePriceMinorUnits: true, vendor: { select: { shippingMode: true, shippingFlatMinorUnits: true, shippingCountries: true, storeName: true } } }
  });

  const vendorPolicies: Record<string, VendorShippingPolicy> = {};
  const itemSubtotals: Record<string, bigint> = {};
  const shippingItems = body.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) throw new Error('Product not found');

    const vendorId = product.vendorId;
    const vendor = product.vendor;

    if (!vendorPolicies[vendorId]) {
      const allowedCountries = vendor.shippingCountries ? JSON.parse(vendor.shippingCountries) : undefined;
      vendorPolicies[vendorId] = {
        vendorId,
        mode: vendor.shippingMode === 'FLAT' ? 'FLAT' : 'REGION',
        flatRateMinorUnits: vendor.shippingFlatMinorUnits != null ? BigInt(vendor.shippingFlatMinorUnits) : undefined,
        countries: Array.isArray(allowedCountries) ? allowedCountries : undefined,
      };
    }
    
    itemSubtotals[vendorId] = (itemSubtotals[vendorId] ?? 0n) + BigInt(product.basePriceMinorUnits * item.quantity);

    return {
      vendorId,
      weightGrams: product.weightGrams ?? 500,
      quantity: item.quantity,
    };
  });

  const shippingZones: ShippingZone[] = regionConfig.shippingZones.map((z, i) => ({
    id: `zone-${i}`,
    name: z.name,
    countries: z.countries,
    baseRateMinorUnits: BigInt(z.baseRateMinorUnits),
    currencyCode: z.currencyCode,
    perKgRateMinorUnits: z.perKgRateMinorUnits ? BigInt(z.perKgRateMinorUnits) : undefined,
    freeShippingThresholdMinorUnits: z.freeShippingThresholdMinorUnits ? BigInt(z.freeShippingThresholdMinorUnits) : undefined,
    estimatedDaysMin: z.estimatedDaysMin,
    estimatedDaysMax: z.estimatedDaysMax,
    carriers: z.carriers,
    enabled: true,
  }));

  try {
    const result = calculateGroupedShipping(
      { items: shippingItems, itemSubtotals, country: body.country, regionKey: body.regionKey },
      vendorPolicies,
      shippingZones
    );

    res.json({ rates: result });
  } catch (err: any) {
    res.status(400).json({ error: { code: 'SHIPPING_ERROR', message: err.message } });
  }
});

export { router as shippingRouter };
