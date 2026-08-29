import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, authorize, AuthRequest, requireVerifiedEmail } from '../middleware/auth.js';
import { CheckoutSchema, DEFAULT_REGIONS } from '@Storegrill/shared';
import { calculateTax, TaxRule } from '@Storegrill/shared';
import { ShippingZone, VendorShippingPolicy, calculateGroupedShipping } from '@Storegrill/shared';
import { createMoney, convertMoney } from '@Storegrill/shared';
import { v4 as uuid } from 'uuid';
import { initiatePaypalPayment, initiateStripePayment, type PaymentOrderContext } from '../payments/providers.js';
import { validateCoupon } from '../services/coupons.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query);

  const where = {
    userId: req.user!.id,
    ...(query.status && { status: query.status as any }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        items: {
          include: {
            product: { select: { thumbnail: true } },
            vendor: { select: { storeName: true } },
          },
        },
        shipments: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    orders: orders.map((o: any) => ({
      ...o,
      subtotalMinorUnits: Number(o.subtotalMinorUnits),
      taxMinorUnits: Number(o.taxMinorUnits),
      shippingMinorUnits: Number(o.shippingMinorUnits),
      discountMinorUnits: Number(o.discountMinorUnits),
      totalMinorUnits: Number(o.totalMinorUnits),
      items: o.items.map((i: any) => ({
        ...i,
        unitPriceMinorUnits: Number(i.unitPriceMinorUnits),
        totalMinorUnits: Number(i.totalMinorUnits),
      })),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const order = await prisma.order.findFirst({
    where: { id, userId: req.user!.id },
    include: {
      items: {
        include: {
          product: { select: { thumbnail: true, slug: true } },
          vendor: { select: { id: true, storeName: true, slug: true } },
        },
      },
      shipments: {
        include: { events: { orderBy: { timestamp: 'desc' } } },
      },
      payments: true,
      refunds: true,
    },
  });

  if (!order) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Order not found' },
    });
  }

  res.json({
    order: {
      ...order,
      subtotalMinorUnits: Number(order.subtotalMinorUnits),
      taxMinorUnits: Number(order.taxMinorUnits),
      shippingMinorUnits: Number(order.shippingMinorUnits),
      discountMinorUnits: Number(order.discountMinorUnits),
      totalMinorUnits: Number(order.totalMinorUnits),
      items: order.items.map((i: any) => ({
        ...i,
        unitPriceMinorUnits: Number(i.unitPriceMinorUnits),
        totalMinorUnits: Number(i.totalMinorUnits),
      })),
    },
  });
});

router.post('/checkout', requireVerifiedEmail, async (req: AuthRequest, res: Response) => {
  const body = CheckoutSchema.parse(req.body);

  const cart = await prisma.cart.findUnique({
    where: { userId: req.user!.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, sku: true, thumbnail: true,
              basePriceMinorUnits: true, currencyCode: true,
              vendorId: true, categoryId: true, status: true,
              vendor: {
                select: { shippingMode: true, shippingFlatMinorUnits: true },
              },
            },
          },
          variant: {
            select: {
              id: true, name: true, sku: true, basePriceMinorUnits: true,
              stock: true, images: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      error: { code: 'EMPTY_CART', message: 'Cart is empty' },
    });
  }

  const regionConfig = DEFAULT_REGIONS.find(r => r.key === (body.regionKey || 'UK')) || DEFAULT_REGIONS[0];
  const currencyCode = regionConfig.defaultCurrency;

  const productIds = cart.items.map((item: any) => item.product.id);
  const regionPrices = await prisma.productRegionPrice.findMany({
    where: { productId: { in: productIds }, regionKey: regionConfig.key },
  });
  const regionPriceByProduct = new Map(regionPrices.map((rp: any) => [rp.productId, rp]));

  for (const item of cart.items) {
    if (item.product.status !== 'ACTIVE') {
      return res.status(400).json({
        error: { code: 'PRODUCT_UNAVAILABLE', message: `${item.product.name} is no longer available` },
      });
    }
    if (item.variant && item.variant.stock < item.quantity) {
      return res.status(400).json({
        error: { code: 'INSUFFICIENT_STOCK', message: `Not enough stock for ${item.product.name}` },
      });
    }
  }

  const orderItems = cart.items.map((item: any) => {
    const basePrice = item.variant
      ? Number(item.variant.basePriceMinorUnits)
      : Number(item.product.basePriceMinorUnits);
    const productCurrency = item.product.currencyCode || 'USD';
    let unitPrice = basePrice;
    const regionPrice = regionPriceByProduct.get(item.product.id);
    if (regionPrice) {
      unitPrice = Number(regionPrice.priceMinorUnits);
    } else if (productCurrency !== currencyCode) {
      const converted = convertMoney(createMoney(BigInt(basePrice), productCurrency), currencyCode);
      unitPrice = Number(converted.amountMinorUnits);
    }
    return {
      productId: item.product.id,
      variantId: item.variantId,
      vendorId: item.product.vendorId,
      categoryId: item.product.categoryId,
      name: item.product.name,
      sku: item.variant?.sku || item.product.sku,
      image: item.product.thumbnail || (() => {
        try {
          const images = typeof item.variant?.images === 'string' ? JSON.parse(item.variant.images) : item.variant?.images;
          return Array.isArray(images) ? images[0] : undefined;
        } catch { return undefined; }
      })(),
      quantity: item.quantity,
      unitPriceMinorUnits: unitPrice,
      totalMinorUnits: unitPrice * item.quantity,
    };
  });

  const subtotal = orderItems.reduce((sum: any, item: any) => sum + item.totalMinorUnits, 0);

  let discount = 0;
  let appliedCouponId: string | null = null;
  if (body.couponCode) {
    const couponResult = await validateCoupon(body.couponCode, subtotal, currencyCode);
    if (!couponResult.ok) {
      return res.status(couponResult.status).json({ error: { code: couponResult.code, message: couponResult.message } });
    }
    discount = couponResult.coupon.discountMinorUnits;
    appliedCouponId = couponResult.coupon.couponId;
  }
  const discountedSubtotal = subtotal - discount;

  const taxRules: TaxRule[] = regionConfig.taxRules.map((r, i) => ({
    id: `region-${i}`,
    name: r.name,
    rate: r.rate,
    type: r.type as TaxRule['type'],
    categoryId: r.categoryId,
    enabled: true,
  }));

  const taxResult = calculateTax(
    {
      subtotal: createMoney(BigInt(discountedSubtotal), currencyCode),
      items: orderItems.map((item: any) => ({
        productId: item.productId,
        categoryId: item.categoryId || '',
        priceMinorUnits: BigInt(item.unitPriceMinorUnits),
        quantity: item.quantity,
      })),
      regionKey: regionConfig.key,
      shippingCost: createMoney(0n, currencyCode),
    },
    taxRules,
  );

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

  const vendorPolicies: Record<string, VendorShippingPolicy> = {};
  const itemSubtotals: Record<string, bigint> = {};
  for (const oi of orderItems) {
    const vendor = cart.items.find((item: any) => item.product.vendorId === oi.vendorId)?.product.vendor;
    if (vendor && !vendorPolicies[oi.vendorId]) {
      vendorPolicies[oi.vendorId] = {
        vendorId: oi.vendorId,
        mode: vendor.shippingMode === 'FLAT' ? 'FLAT' : 'REGION',
        flatRateMinorUnits: vendor.shippingFlatMinorUnits != null ? BigInt(vendor.shippingFlatMinorUnits) : undefined,
      };
    }
    itemSubtotals[oi.vendorId] = (itemSubtotals[oi.vendorId] ?? 0n) + BigInt(oi.totalMinorUnits);
  }

  const grouped = calculateGroupedShipping(
    {
      items: cart.items.map((item: any) => ({
        vendorId: item.product.vendorId,
        weightGrams: 500,
        quantity: item.quantity,
      })),
      itemSubtotals,
      country: body.shippingAddress?.country || 'GB',
      regionKey: regionConfig.key,
    },
    vendorPolicies,
    shippingZones,
  );

  const tax = Number(taxResult.totalTax.amountMinorUnits);
  const shipping = grouped ? Number(grouped.totalMinorUnits) : 0;
  const total = discountedSubtotal + tax + shipping;

  const orderNumber = `SG-${Date.now().toString(36).toUpperCase()}-${uuid().slice(0, 4).toUpperCase()}`;

  const provider = body.paymentMethod === 'cod' ? 'cod' : body.paymentMethod === 'paypal' ? 'paypal' : 'stripe';
  const needsRedirectFlow = provider !== 'cod';

  const paymentCtx: PaymentOrderContext = {
    orderNumber,
    currencyCode,
    totalMinorUnits: total,
    items: orderItems.map((item: any) => ({
      name: item.name,
      unitPriceMinorUnits: item.unitPriceMinorUnits,
      quantity: item.quantity,
    })),
    customerEmail: typeof body.email === 'string' && body.email.includes('@') ? body.email : undefined,
  };

  let initiated: Awaited<ReturnType<typeof initiateStripePayment>> | null = null;
  if (needsRedirectFlow) {
    try {
      initiated =
        provider === 'paypal'
          ? await initiatePaypalPayment(paymentCtx)
          : await initiateStripePayment(paymentCtx);
    } catch (err) {
      return res.status(502).json({
        error: {
          code: 'PAYMENT_PROVIDER_ERROR',
          message: err instanceof Error ? err.message : 'The payment provider is unavailable. Your data is safe — please retry.',
        },
      });
    }
  }

  const orderStatus = initiated?.status === 'REQUIRES_REDIRECT' ? 'AWAITING_PAYMENT' : 'CONFIRMED';
  const paymentStatus = initiated
    ? initiated.status === 'CAPTURED'
      ? 'CAPTURED'
      : 'PENDING'
    : body.paymentMethod === 'cod'
      ? 'PENDING'
      : 'CAPTURED';

  const order = await prisma.$transaction(async (tx: any) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: req.user!.id,
        status: orderStatus,
        regionKey: regionConfig.key,
        currencyCode: currencyCode,
        subtotalMinorUnits: subtotal,
        taxMinorUnits: tax,
        shippingMinorUnits: shipping,
        discountMinorUnits: discount,
        totalMinorUnits: total,
        shippingAddress: JSON.stringify(body.shippingAddress),
        billingAddress: JSON.stringify(body.billingAddress || body.shippingAddress),
        paymentMethod: body.paymentMethod,
        paymentStatus,
        items: {
          create: orderItems.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId,
            vendorId: item.vendorId,
            name: item.name,
            sku: item.sku,
            image: item.image,
            quantity: item.quantity,
            unitPriceMinorUnits: item.unitPriceMinorUnits,
            totalMinorUnits: item.totalMinorUnits,
          })),
        },
        ...(initiated && {
          payments: {
            create: {
              method: body.paymentMethod,
              providerPaymentId: initiated.providerPaymentId,
              amountMinorUnits: total,
              currencyCode,
              status: initiated.status === 'CAPTURED' ? 'CAPTURED' : 'REQUIRES_REDIRECT',
              metadata: JSON.stringify({ provider: initiated.provider, mode: initiated.mode }),
            },
          },
        }),
      },
      include: { items: true, payments: true },
    });

    if (appliedCouponId) {
      await tx.coupon.update({
        where: { id: appliedCouponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return created;
  });

  for (const item of cart.items) {
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      });
    }
    await prisma.product.update({
      where: { id: item.productId },
      data: { totalSales: { increment: item.quantity } },
    });
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  res.status(201).json({
    order: {
      ...order,
      subtotalMinorUnits: Number(order.subtotalMinorUnits),
      taxMinorUnits: Number(order.taxMinorUnits),
      shippingMinorUnits: Number(order.shippingMinorUnits),
      totalMinorUnits: Number(order.totalMinorUnits),
      items: order.items.map((i: any) => ({
        ...i,
        unitPriceMinorUnits: Number(i.unitPriceMinorUnits),
        totalMinorUnits: Number(i.totalMinorUnits),
      })),
    },
    payment: initiated && {
      provider: initiated.provider,
      mode: initiated.mode,
      status: initiated.status,
      redirectUrl: initiated.redirectUrl ?? null,
    },
  });
});

router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const order = await prisma.order.findFirst({
    where: { id, userId: req.user!.id },
    include: { items: true },
  });

  if (!order) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Order not found' },
    });
  }

  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    return res.status(400).json({
      error: { code: 'CANNOT_CANCEL', message: 'Order cannot be cancelled at this stage' },
    });
  }

  await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
  });

  for (const item of order.items) {
    if (item.variantId) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await prisma.product.update({
      where: { id: item.productId },
      data: { totalSales: { decrement: item.quantity } },
    });
  }

  res.json({ message: 'Order cancelled' });
});

export { router as ordersRouter };
