import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  const [
    userCount, vendorCount, productCount, orderCount,
    totalRevenue, pendingVendors, pendingProducts, recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vendorProfile.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count(),
    prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { totalMinorUnits: true } }),
    prisma.vendorProfile.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { totalMinorUnits: true } },
      },
    }),
  ]);

  res.json({
    dashboard: {
      userCount,
      vendorCount,
      productCount,
      orderCount,
      totalRevenue: Number(totalRevenue._sum.totalMinorUnits || 0),
      pendingVendors,
      pendingProducts,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalMinorUnits: Number(o.totalMinorUnits),
        user: o.user,
        createdAt: o.createdAt,
      })),
    },
  });
});

router.get('/vendors', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query);

  const where = query.status ? { status: query.status as any } : {};

  const [vendors, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.vendorProfile.count({ where }),
  ]);

  res.json({
    vendors: vendors.map(v => ({
      ...v,
      rating: Number(v.rating),
      productCount: v._count.products,
      userEmail: v.user.email,
      _count: undefined,
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
});

router.put('/vendors/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']) }).parse(req.body);

  const vendor = await prisma.vendorProfile.update({
    where: { id },
    data: { status: body.status },
  });

  await audit(req, 'VENDOR_STATUS_CHANGED', 'VendorProfile', id, { status: body.status });

  if (body.status !== 'ACTIVE') {
    await prisma.storefront.updateMany({ where: { vendorId: id }, data: { enabled: false } });
  } else {
    await prisma.storefront.updateMany({ where: { vendorId: id }, data: { enabled: true } });
    await prisma.user.update({ where: { id: vendor.userId }, data: { role: 'VENDOR' } });
  }

  res.json({ vendor: { ...vendor, rating: Number(vendor.rating) } });
});

router.put('/vendors/:id/kyc', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ kycStatus: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);

  const vendor = await prisma.vendorProfile.update({
    where: { id },
    data: { kycStatus: body.kycStatus },
  });

  await audit(req, 'VENDOR_KYC_DECIDED', 'VendorProfile', id, { kycStatus: body.kycStatus });

  res.json({ vendor: { ...vendor, rating: Number(vendor.rating) } });
});

router.post('/vendors/:id/approve', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ reviewNotes: z.string().max(2000).optional() }).parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({ where: { id }, include: { payoutAccount: true, storefronts: true } });
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
  }
  if (!['UNDER_REVIEW', 'PENDING'].includes(vendor.status)) {
    return res.status(409).json({ error: { code: 'INVALID_STATE', message: `Cannot approve a ${vendor.status} application` } });
  }

  const pct = await getCommissionPct();
  const now = new Date();

  const updated = await prisma.vendorProfile.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      revenueSharePct: vendor.revenueSharePct === 15.0 ? pct : vendor.revenueSharePct,
      reviewedBy: req.user!.id,
      reviewedAt: now,
      ...(body.reviewNotes && { reviewNotes: body.reviewNotes }),
      payoutMethod: mergeAcceptedTerms(vendor.payoutMethod),
    },
  });

  if (vendor.storefronts.length === 0) {
    await provisionStorefronts(vendor);
  } else {
    await prisma.storefront.updateMany({ where: { vendorId: id }, data: { enabled: true } });
  }

  await prisma.user.update({ where: { id: vendor.userId }, data: { role: 'VENDOR' } });

  await audit(req, 'VENDOR_APPROVED', 'VendorProfile', id, { status: 'ACTIVE', commissionPct: updated.revenueSharePct });  await notifyVendorDecision(vendor.userId, vendor.storeName, true);

  res.json({ vendor: { ...updated, rating: Number(updated.rating) }, storefronts: await prisma.storefront.findMany({ where: { vendorId: id } }) });
});

router.post('/vendors/:id/reject', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ reviewNotes: z.string().min(5).max(2000) }).parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({ where: { id } });
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
  }
  if (['ACTIVE', 'SUSPENDED', 'BANNED'].includes(vendor.status)) {
    return res.status(409).json({ error: { code: 'INVALID_STATE', message: `Use suspend/ban for an active store` } });
  }

  const updated = await prisma.vendorProfile.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedBy: req.user!.id,
      reviewedAt: new Date(),
      reviewNotes: body.reviewNotes,
      payoutMethod: mergeAcceptedTerms(vendor.payoutMethod),
    },
  });

  await audit(req, 'VENDOR_REJECTED', 'VendorProfile', id, { status: 'REJECTED' });
  await notifyVendorDecision(vendor.userId, vendor.storeName, false, body.reviewNotes);

  res.json({ vendor: { ...updated, rating: Number(updated.rating) } });
});

async function audit(req: AuthRequest, action: string, entity: string, entityId: string | undefined, after: object) {
  await prisma.auditLog.create({
    data: {
      userId: req.user!.id,
      action,
      entity,
      entityId,
      after: JSON.stringify(after),
    },
  });
}

async function getCommissionPct(): Promise<number> {
  const row = await prisma.platformConfig.findUnique({ where: { key: 'vendorCommissionPct' } });
  return row ? Number(row.value) : 12;
}

function safeParse(json: string | null): any {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function mergeAcceptedTerms(payoutMethod: string | null): string {
  return JSON.stringify({ ...safeParse(payoutMethod), acceptedTermsAt: new Date().toISOString() });
}

async function provisionStorefronts(vendor: { id: string; slug: string; storeName: string; warehouseRegionKey: string; description: string | null }) {
  const regionKeys = [...new Set([vendor.warehouseRegionKey, 'UK'])];
  for (const regionKey of regionKeys) {
    const slug = regionKeys.length > 1 ? `${vendor.slug}-${regionKey.toLowerCase()}` : vendor.slug;
    const clash = await prisma.storefront.findFirst({ where: { slug, vendorId: { not: vendor.id } } });
    await prisma.storefront.upsert({
      where: { vendorId_regionKey: { vendorId: vendor.id, regionKey } },
      update: { enabled: true },
      create: {
        vendorId: vendor.id,
        regionKey,
        slug: clash ? `${slug}-${Date.now()}` : slug,
        name: vendor.storeName,
        description: vendor.description,
      },
    });
  }
}

async function notifyVendorDecision(userId: string, storeName: string, approved: boolean, notes?: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const { sendMail } = await import('../lib/mailer.js');
    if (approved) {
      await sendMail({
        to: user.email,
        subject: 'Your Storegrill store is live',
        text: `Congratulations â€” "${storeName}" is approved and your storefronts are live. You can now list products in the vendor portal.`,
      });
    } else {
      await sendMail({
        to: user.email,
        subject: 'Update on your Storegrill seller application',
        text: `We reviewed your application for "${storeName}" and are unable to approve it at this time.${notes ? `\n\nReviewer notes: ${notes}` : ''}\nYou can update your application and reapply.`,
      });
    }
  } catch (err) {
    console.error('[mail] vendor decision notice failed:', err);
  }
}

router.get('/vendors/:id/documents', async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: req.params.id },
    select: { documents: true },
  });
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
  }

  let docs: Array<{ name: string; blob: string; size: number; uploadedAt: string }> = [];
  try {
    docs = vendor.documents ? JSON.parse(vendor.documents) : [];
  } catch {
    docs = [];
  }
  if (!Array.isArray(docs) || docs.length === 0) {
    return res.json({ documents: [] });
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    return res.json({
      documents: docs.map(d => ({ name: d.name, size: d.size, uploadedAt: d.uploadedAt, url: null })),
      note: 'Storage not configured in this environment',
    });
  }

  const { StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = await import('@azure/storage-blob');
  const parts = Object.fromEntries(connectionString.split(';').map(pair => {
    const idx = pair.indexOf('=');
    return [pair.slice(0, idx).toLowerCase(), pair.slice(idx + 1)];
  }));
  if (!parts.endpoint || !parts.accesskey) {
    return res.status(503).json({ error: { code: 'STORAGE_MISCONFIGURED', message: 'AZURE_STORAGE_CONNECTION_STRING must contain endpoint and accesskey' } });
  }
  const accountName = new URL(parts.endpoint).hostname.split('.')[0];
  const credential = new StorageSharedKeyCredential(accountName, parts.accesskey);
  const containerName = process.env.AZURE_STORAGE_KYC_CONTAINER || 'kyc-docs';
  const expiresOn = new Date(Date.now() + 10 * 60 * 1000);

  const documents = docs.map(d => {
    try {
      const sas = generateBlobSASQueryParameters(
        { containerName, blobName: d.blob, permissions: BlobSASPermissions.parse('r'), expiresOn },
        credential,
      ).toString();
      return { name: d.name, size: d.size, uploadedAt: d.uploadedAt, url: `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(d.blob)}?${sas}` };
    } catch {
      return { name: d.name, size: d.size, uploadedAt: d.uploadedAt, url: null };
    }
  });

  res.json({ documents });
});

router.get('/products', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query);

  const where = query.status ? { status: query.status as any } : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        vendor: { select: { storeName: true, slug: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    products: products.map(p => ({
      ...p,
      basePriceMinorUnits: Number(p.basePriceMinorUnits),
      rating: Number(p.rating),
      vendorName: p.vendor.storeName,
      categoryName: p.category.name,
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
});

router.put('/products/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']) }).parse(req.body);

  const product = await prisma.product.update({
    where: { id },
    data: { status: body.status },
  });

  res.json({ product: { ...product, basePriceMinorUnits: Number(product.basePriceMinorUnits) } });
});

router.get('/orders', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query);

  const where = query.status ? { status: query.status as any } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { totalMinorUnits: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    orders: orders.map(o => ({
      ...o,
      subtotalMinorUnits: Number(o.subtotalMinorUnits),
      taxMinorUnits: Number(o.taxMinorUnits),
      shippingMinorUnits: Number(o.shippingMinorUnits),
      totalMinorUnits: Number(o.totalMinorUnits),
      userName: o.user.name,
      userEmail: o.user.email,
      itemCount: o.items.length,
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
});

router.put('/orders/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ status: z.enum(['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']) }).parse(req.body);

  const order = await prisma.order.update({
    where: { id },
    data: { status: body.status },
  });

  res.json({ order: { ...order, totalMinorUnits: Number(order.totalMinorUnits) } });
});

router.get('/reviews', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query);

  const where = query.status ? { status: query.status as any } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    reviews: reviews.map(r => ({
      ...r,
      userName: r.user.name,
      productName: r.product.name,
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
});

router.put('/reviews/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const body = z.object({ status: z.enum(['APPROVED', 'REJECTED']) }).parse(req.body);

  const review = await prisma.review.update({
    where: { id },
    data: { status: body.status },
  });

  res.json({ review });
});

router.get('/regions', async (_req: AuthRequest, res: Response) => {
  const regions = await prisma.region.findMany({
    include: {
      taxRules: true,
      shippingZones: true,
      _count: { select: { products: true } },
    },
  });

  res.json({ regions });
});

router.post('/regions', async (req: AuthRequest, res: Response) => {
  const body = z.object({
    key: z.string().min(2).max(10),
    name: z.string().min(1),
    languages: z.array(z.string()).min(1),
    defaultLanguage: z.string(),
    currencies: z.array(z.string()).min(1),
    defaultCurrency: z.string().length(3),
    defaultTimezone: z.string(),
  }).parse(req.body);

  const existing = await prisma.region.findUnique({ where: { key: body.key } });
  if (existing) {
    return res.status(409).json({
      error: { code: 'REGION_EXISTS', message: 'Region with this key already exists' },
    });
  }

  const region = await prisma.region.create({ data: {
    key: body.key,
    name: body.name,
    languages: JSON.stringify(body.languages),
    defaultLanguage: body.defaultLanguage,
    currencies: JSON.stringify(body.currencies),
    defaultCurrency: body.defaultCurrency,
    defaultTimezone: body.defaultTimezone,
  } });
  res.status(201).json({ region });
});

router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    entity: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }).parse(req.query);

  const where = query.entity ? { entity: query.entity } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    logs,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
});

export { router as adminRouter };
