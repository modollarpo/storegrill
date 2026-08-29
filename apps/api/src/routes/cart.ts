import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createMoney, formatMoney } from '@Storegrill/shared';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user!.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, thumbnail: true,
              basePriceMinorUnits: true, currencyCode: true,
              vendor: { select: { id: true, storeName: true } },
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

  if (!cart) {
    return res.json({ cart: { items: [], totalItems: 0 } });
  }

  const items = cart.items.map((item: any) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    name: item.product.name,
    slug: item.product.slug,
    image: item.product.thumbnail || (() => {
      try {
        const images = typeof item.variant?.images === 'string' ? JSON.parse(item.variant.images) : item.variant?.images;
        return Array.isArray(images) ? images[0] : undefined;
      } catch { return undefined; }
    })(),
    unitPriceMinorUnits: item.variant
      ? Number(item.variant.basePriceMinorUnits)
      : Number(item.product.basePriceMinorUnits),
    quantity: item.quantity,
    lineTotalMinorUnits: (item.variant
      ? Number(item.variant.basePriceMinorUnits)
      : Number(item.product.basePriceMinorUnits)) * item.quantity,
    vendorId: item.product.vendor.id,
    vendorName: item.product.vendor.storeName,
    inStock: item.variant ? item.variant.stock >= item.quantity : true,
    currencyCode: item.product.currencyCode,
  }));

  const subtotal = items.reduce((sum: any, item: any) => sum + item.lineTotalMinorUnits, 0);

  res.json({
    cart: {
      id: cart.id,
      items,
      totalItems: items.reduce((sum: any, item: any) => sum + item.quantity, 0),
      subtotalMinorUnits: subtotal,
      currencyCode: items[0]?.currencyCode || 'USD',
    },
  });
});

router.post('/items', async (req: AuthRequest, res: Response) => {
  const body = z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().default(1),
  }).parse(req.body);

  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: { id: true, status: true, vendorId: true },
  });

  if (!product || product.status !== 'ACTIVE') {
    return res.status(404).json({
      error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found or unavailable' },
    });
  }

  if (body.variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: body.variantId },
      select: { id: true, stock: true, productId: true },
    });

    if (!variant || variant.productId !== body.productId) {
      return res.status(400).json({
        error: { code: 'INVALID_VARIANT', message: 'Invalid product variant' },
      });
    }

    if (variant.stock < body.quantity) {
      return res.status(400).json({
        error: { code: 'INSUFFICIENT_STOCK', message: 'Not enough stock available' },
      });
    }
  }

  let cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: req.user!.id } });
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: body.productId,
      variantId: body.variantId || null,
    },
  });

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: existingItem.quantity + body.quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: body.productId,
        variantId: body.variantId,
        quantity: body.quantity,
      },
    });
  }

  res.status(201).json({ message: 'Item added to cart' });
});

router.put('/items/:itemId', async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const body = z.object({ quantity: z.number().int().positive() }).parse(req.body);

  const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
  if (!cart) {
    return res.status(404).json({
      error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
    });
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    return res.status(404).json({
      error: { code: 'ITEM_NOT_FOUND', message: 'Cart item not found' },
    });
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity: body.quantity },
  });

  res.json({ message: 'Cart updated' });
});

router.delete('/items/:itemId', async (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;

  const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
  if (!cart) {
    return res.status(404).json({
      error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
    });
  }

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!item) {
    return res.status(404).json({
      error: { code: 'ITEM_NOT_FOUND', message: 'Cart item not found' },
    });
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  res.status(204).send();
});

router.delete('/', async (req: AuthRequest, res: Response) => {
  const cart = await prisma.cart.findUnique({ where: { userId: req.user!.id } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  res.status(204).send();
});

export { router as cartRouter };
