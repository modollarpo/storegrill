import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, authorize, AuthRequest } from '../middleware/auth.js';
import { cache, TTL } from '../lib/cache.js';
import { ProductFilterSchema } from '@Storegrill/shared';
import { slugify } from '../utils/slugify.js';

const router = Router();

router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const query = ProductFilterSchema.parse(req.query);
  const regionKey = query.regionKey;

  let categoryId = query.categoryId;
  if (!categoryId && query.category) {
    const cat = await prisma.category.findUnique({ where: { slug: query.category }, select: { id: true } });
    if (cat) categoryId = cat.id;
  }

  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    ...(categoryId && { categoryId }),
    ...(query.brandId && { brandId: query.brandId }),
    ...(query.vendorId && { vendorId: query.vendorId }),
    ...(query.minRating && { rating: { gte: query.minRating } }),
    ...(query.q && {
      OR: [
        { name: { contains: query.q } },
        { description: { contains: query.q } },
        { tags: { contains: query.q } },
      ],
    }),
    ...(query.inStock !== undefined && {
      variants: query.inStock
        ? { some: { stock: { gt: 0 } } }
        : { every: { stock: 0 } },
    }),
    ...(query.minPrice || query.maxPrice
      ? {
          regionPrices: {
            some: {
              regionKey,
              priceMinorUnits: {
                ...(query.minPrice && { gte: Number(query.minPrice) }),
                ...(query.maxPrice && { lte: Number(query.maxPrice) }),
              },
            },
          },
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === 'price_asc'
      ? { basePriceMinorUnits: 'asc' }
      : query.sort === 'price_desc'
      ? { basePriceMinorUnits: 'desc' }
      : query.sort === 'rating'
      ? { rating: 'desc' }
      : query.sort === 'newest'
      ? { createdAt: 'desc' }
      : { totalSales: 'desc' };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vendor: { select: { id: true, storeName: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        regionPrices: { where: { regionKey }, take: 1 },
        _count: { select: { variants: { where: { stock: { gt: 0 } } } } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const enriched = products.map((p: any) => ({
    ...p,
    images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images,
    tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
    basePriceMinorUnits: Number(p.basePriceMinorUnits),
    price: p.regionPrices[0] ? Number(p.regionPrices[0].priceMinorUnits) : Number(p.basePriceMinorUnits),
    currencyCode: p.regionPrices[0]?.currencyCode || p.currencyCode,
    inStock: p._count.variants > 0,
    rating: Number(p.rating),
    regionPrices: undefined,
    _count: undefined,
  }));

  res.json({
    products: enriched,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
});

router.get('/featured', optionalAuth, async (req: AuthRequest, res: Response) => {
  const regionKey = (req.query.regionKey as string) || 'UK';

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', totalSales: { gt: 0 } },
    orderBy: { totalSales: 'desc' },
    take: 12,
    include: {
      vendor: { select: { id: true, storeName: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      regionPrices: { where: { regionKey }, take: 1 },
    },
  });

  res.json({
    products: products.map((p: any) => ({
      ...p,
      images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
      basePriceMinorUnits: Number(p.basePriceMinorUnits),
      price: p.regionPrices[0] ? Number(p.regionPrices[0].priceMinorUnits) : Number(p.basePriceMinorUnits),
      currencyCode: p.regionPrices[0]?.currencyCode || p.currencyCode,
      rating: Number(p.rating),
      regionPrices: undefined,
    })),
  });
});

router.get('/:identifier', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { identifier } = req.params;
  const regionKey = (req.query.regionKey as string) || 'UK';
  const cacheKey = `product:${identifier}:${regionKey}`;

  const cached = cache.get<object>(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const product = await prisma.product.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    include: {
      vendor: { select: { id: true, storeName: true, slug: true, rating: true } },
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      variants: true,
      regionPrices: { where: { regionKey } },
      reviews: {
        where: { status: 'APPROVED' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
    },
  });

  if (!product) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }

  const payload = {
    product: {
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      tags: typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags,
      attributes: typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes,
      basePriceMinorUnits: Number(product.basePriceMinorUnits),
      price: product.regionPrices[0]
        ? Number(product.regionPrices[0].priceMinorUnits)
        : Number(product.basePriceMinorUnits),
      currencyCode: product.regionPrices[0]?.currencyCode || product.currencyCode,
      rating: Number(product.rating),
      inventoryCount: product.variants.reduce((sum: number, v: { stock: number }) => sum + v.stock, 0),
      variants: product.variants.map((v: any) => ({
        ...v,
        basePriceMinorUnits: Number(v.basePriceMinorUnits),
        images: typeof v.images === 'string' ? JSON.parse(v.images) : v.images,
        attributes: typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes,
      })),
      reviews: product.reviews.map((r: any) => ({
        ...r,
        user: r.user,
      })),
      regionPrices: undefined,
    },
  };

  cache.set(cacheKey, payload, TTL.product);
  res.setHeader('X-Cache', 'MISS');
  res.json(payload);
});

router.post('/', authenticate, authorize('VENDOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
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
    tags: z.array(z.string()).default([]),
    attributes: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
    variants: z.array(z.object({
      name: z.string().min(1),
      sku: z.string().min(1),
      basePriceMinorUnits: z.number().int().nonnegative(),
      images: z.array(z.string()).default([]),
      attributes: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
      stock: z.number().int().nonnegative().default(0),
      weightGrams: z.number().int().positive().optional(),
    })).default([]),
    regionPrices: z.array(z.object({
      regionKey: z.string(),
      priceMinorUnits: z.number().int().nonnegative(),
      currencyCode: z.string().length(3),
    })).default([]),
  }).parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor || vendor.status !== 'ACTIVE') {
    return res.status(403).json({
      error: { code: 'VENDOR_INACTIVE', message: 'Vendor account is not active' },
    });
  }

  const slug = slugify(body.name);

  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

  const product = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      name: body.name,
      slug: finalSlug,
      description: body.description,
      shortDescription: body.shortDescription,
      sku: body.sku,
      barcode: body.barcode,
      categoryId: body.categoryId,
      brandId: body.brandId,
      images: JSON.stringify(body.images),
      thumbnail: body.thumbnail || body.images[0],
      basePriceMinorUnits: body.basePriceMinorUnits,
      currencyCode: body.currencyCode,
      weightGrams: body.weightGrams,
      tags: JSON.stringify(body.tags),
      attributes: JSON.stringify(body.attributes),
      status: 'PENDING_REVIEW',
      variants: {
        create: body.variants.map(v => ({
          name: v.name,
          sku: v.sku,
          basePriceMinorUnits: v.basePriceMinorUnits,
          images: JSON.stringify(v.images),
          attributes: JSON.stringify(v.attributes),
          stock: v.stock,
          weightGrams: v.weightGrams,
        })),
      },
      regionPrices: {
        create: body.regionPrices.map(rp => ({
          regionKey: rp.regionKey,
          priceMinorUnits: rp.priceMinorUnits,
          currencyCode: rp.currencyCode,
        })),
      },
    },
    include: {
      variants: true,
      regionPrices: true,
    },
  });

  res.status(201).json({
    product: {
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      tags: typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags,
      attributes: typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes,
      basePriceMinorUnits: Number(product.basePriceMinorUnits),
      variants: product.variants.map((v: any) => ({
        ...v,
        basePriceMinorUnits: Number(v.basePriceMinorUnits),
        images: typeof v.images === 'string' ? JSON.parse(v.images) : v.images,
        attributes: typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes,
      })),
      regionPrices: product.regionPrices.map((rp: any) => ({
        ...rp,
        priceMinorUnits: Number(rp.priceMinorUnits),
      })),
    },
  });
});

router.put('/:id', authenticate, authorize('VENDOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }

  if (req.user!.role !== 'ADMIN') {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!vendor || vendor.id !== existing.vendorId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not your product' },
      });
    }
  }

  const body = z.object({
    name: z.string().min(1).max(500).optional(),
    description: z.string().min(1).optional(),
    shortDescription: z.string().max(500).optional(),
    sku: z.string().min(1).max(100).optional(),
    barcode: z.string().max(100).optional(),
    categoryId: z.string().optional(),
    brandId: z.string().optional(),
    images: z.array(z.string().url()).max(20).optional(),
    thumbnail: z.string().url().optional(),
    basePriceMinorUnits: z.number().int().nonnegative().optional(),
    currencyCode: z.string().length(3).optional(),
    weightGrams: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    attributes: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    status: z.enum(['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE']).optional(),
  }).parse(req.body);

  const updateData: Prisma.ProductUpdateInput = {};
  if (body.name) updateData.name = body.name;
  if (body.description) updateData.description = body.description;
  if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
  if (body.sku) updateData.sku = body.sku;
  if (body.barcode !== undefined) updateData.barcode = body.barcode;
  if (body.categoryId) updateData.category = { connect: { id: body.categoryId } };
  if (body.brandId !== undefined) updateData.brand = body.brandId ? { connect: { id: body.brandId } } : { disconnect: true };
  if (body.images) updateData.images = JSON.stringify(body.images);
  if (body.thumbnail !== undefined) updateData.thumbnail = body.thumbnail;
  if (body.basePriceMinorUnits !== undefined) updateData.basePriceMinorUnits = body.basePriceMinorUnits;
  if (body.currencyCode) updateData.currencyCode = body.currencyCode;
  if (body.weightGrams !== undefined) updateData.weightGrams = body.weightGrams;
  if (body.tags) updateData.tags = JSON.stringify(body.tags);
  if (body.attributes) updateData.attributes = JSON.stringify(body.attributes);
  if (body.status) updateData.status = body.status;

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: { variants: true, regionPrices: true },
  });

  res.json({
    product: {
      ...product,
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
      tags: typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags,
      attributes: typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes,
      basePriceMinorUnits: Number(product.basePriceMinorUnits),
      variants: product.variants.map((v: any) => ({
        ...v,
        basePriceMinorUnits: Number(v.basePriceMinorUnits),
        images: typeof v.images === 'string' ? JSON.parse(v.images) : v.images,
        attributes: typeof v.attributes === 'string' ? JSON.parse(v.attributes) : v.attributes,
      })),
    },
  });
});

router.delete('/:id', authenticate, authorize('VENDOR', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found' },
    });
  }

  if (req.user!.role !== 'ADMIN') {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!vendor || vendor.id !== existing.vendorId) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Not your product' },
      });
    }
  }

  await prisma.product.delete({ where: { id } });
  res.status(204).send();
});

export { router as productsRouter };
