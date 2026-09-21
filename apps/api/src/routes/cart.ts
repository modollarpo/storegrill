import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { dualAuth, type DualAuthRequest } from '../middleware/dual-auth.js';
import { evaluateDeals, type CartItem } from '../services/deal-engine.js';
import { loadActiveDeals } from '../services/deal-eval.js';

const router = Router();

router.use(dualAuth);

async function findCart(req: DualAuthRequest) {
  if (req.user) {
    return prisma.cart.findUnique({ where: { userId: req.user.id } });
  }
  if (req.guestSessionId) {
    return prisma.cart.findUnique({ where: { sessionId: req.guestSessionId } });
  }
  return null;
}

async function upsertCart(req: DualAuthRequest) {
  if (req.user) {
    const existing = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId: req.user.id } });
  }
  if (req.guestSessionId) {
    const existing = await prisma.cart.findUnique({ where: { sessionId: req.guestSessionId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { sessionId: req.guestSessionId } });
  }
  throw new Error('No identity available for cart');
}

router.get('/', async (req: DualAuthRequest, res: Response) => {
  const cart = await findCart(req);

  if (!cart) {
    return res.json({ cart: { items: [], totalItems: 0 } });
  }

  const fullCart = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true, name: true, slug: true, thumbnail: true,
              basePriceMinorUnits: true, currencyCode: true, categoryId: true, vendorId: true,
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

  if (!fullCart) {
    return res.json({ cart: { items: [], totalItems: 0 } });
  }

  const items = fullCart.items.map((item: any) => ({
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
    vendorId: item.product.vendorId,
    vendorName: item.product.vendor.storeName,
    inStock: item.variant ? item.variant.stock >= item.quantity : true,
    currencyCode: item.product.currencyCode,
  }));

  const subtotal = items.reduce((sum: number, item: any) => sum + item.lineTotalMinorUnits, 0);

  const cartItems: CartItem[] = items.map((item: any) => ({
    productId: item.productId,
    categoryId: null,
    vendorId: item.vendorId,
    quantity: item.quantity,
    unitMinorUnits: item.unitPriceMinorUnits,
    currencyCode: item.currencyCode,
  }));
  const orderCurrency = items[0]?.currencyCode || 'USD';
  const { totalDiscountMinorUnits } = evaluateDeals({
    items: cartItems,
    deals: await loadActiveDeals(prisma),
    orderCurrency,
  });
  const totalMinorUnits = Math.max(0, subtotal - totalDiscountMinorUnits);

  res.json({
    cart: {
      id: fullCart.id,
      items,
      totalItems: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      subtotalMinorUnits: subtotal,
      dealDiscountMinorUnits: totalDiscountMinorUnits,
      totalMinorUnits,
      currencyCode: orderCurrency,
    },
  });
});

router.post('/items', async (req: DualAuthRequest, res: Response) => {
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

  const cart = await upsertCart(req);

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

router.put('/items/:itemId', async (req: DualAuthRequest, res: Response) => {
  const { itemId } = req.params;
  const body = z.object({ quantity: z.number().int().positive() }).parse(req.body);

  const cart = await findCart(req);
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

router.delete('/items/:itemId', async (req: DualAuthRequest, res: Response) => {
  const { itemId } = req.params;

  const cart = await findCart(req);
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

router.delete('/', async (req: DualAuthRequest, res: Response) => {
  const cart = await findCart(req);
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
  res.status(204).send();
});

export { router as cartRouter };
