import { Router, Response, Request } from 'express';
import { z } from 'zod';
import { calculateTax, TaxRule, createMoney, DEFAULT_REGIONS } from '@Storegrill/shared';

const router = Router();

router.post('/estimate', async (req: Request, res: Response) => {
  const body = z.object({
    regionKey: z.string().default('UK'),
    subtotalMinorUnits: z.number().int().nonnegative(),
    shippingMinorUnits: z.number().int().nonnegative().default(0),
    items: z.array(z.object({
      productId: z.string(),
      categoryId: z.string().optional().default(''),
      priceMinorUnits: z.number().int().nonnegative(),
      quantity: z.number().int().positive(),
    }))
  }).parse(req.body);

  const regionConfig = DEFAULT_REGIONS.find(r => r.key === body.regionKey) || DEFAULT_REGIONS[0];
  const currencyCode = regionConfig.defaultCurrency;

  const taxRules: TaxRule[] = regionConfig.taxRules.map((r, i) => ({
    id: `region-${i}`,
    name: r.name,
    rate: r.rate,
    type: r.type as TaxRule['type'],
    categoryId: r.categoryId,
    enabled: true,
  }));

  const result = calculateTax(
    {
      subtotal: createMoney(BigInt(body.subtotalMinorUnits), currencyCode),
      items: body.items.map(item => ({
        ...item,
        priceMinorUnits: BigInt(item.priceMinorUnits),
      })),
      regionKey: body.regionKey,
      shippingCost: createMoney(BigInt(body.shippingMinorUnits), currencyCode),
    },
    taxRules
  );

  res.json({
    tax: {
      totalTaxMinorUnits: Number(result.totalTax.amountMinorUnits),
      lines: result.taxLines.map(l => ({
        ...l,
        amountMinorUnits: Number(l.amount.amountMinorUnits),
        amount: undefined,
      })),
    }
  });
});

export { router as taxRouter };
