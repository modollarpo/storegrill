import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../index.js';
import { authenticate, authorize, requireVerifiedEmail, AuthRequest } from '../middleware/auth.js';
import {
  UpdateVendorSchema,
  VendorApplicationPatchSchema,
} from '@Storegrill/shared';
import { slugify } from '../utils/slugify.js';

const KYC_CONTAINER = process.env.AZURE_STORAGE_KYC_CONTAINER || 'kyc-docs';
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

interface StoredDocument {
  name: string;
  blob: string;
  size: number;
  uploadedAt: string;
}

function parseDocuments(json: string | null): StoredDocument[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as StoredDocument[]) : [];
  } catch {
    return [];
  }
}

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  const query = z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query);

  const where = query.status ? { status: query.status as any } : {};

  const [vendors, total] = await Promise.all([
    prisma.vendorProfile.findMany({
      where,
      orderBy: { rating: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true, storeName: true, slug: true, logo: true, banner: true,
        description: true, rating: true, reviewCount: true, status: true,
        createdAt: true,
        user: { select: { name: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.vendorProfile.count({ where }),
  ]);

  res.json({
    vendors: vendors.map((v: any) => ({
      ...v,
      rating: Number(v.rating),
      productCount: v._count.products,
      _count: undefined,
    })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  });
});

const APPLICATION_BLOCKED_STATUSES = ['UNDER_REVIEW', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'BANNED'];

function applicationSnapshot(vendor: { status: string; onboardingStep: number; submittedAt: Date | null; reviewNotes: string | null; reviewedAt: Date | null }) {
  return {
    status: vendor.status,
    step: vendor.onboardingStep,
    submittedAt: vendor.submittedAt,
    reviewNotes: vendor.reviewNotes,
    reviewedAt: vendor.reviewedAt,
  };
}

router.get('/application', authenticate, requireVerifiedEmail, async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.json({ application: null });
  }

  res.json({ application: applicationSnapshot(vendor), vendor });
});

router.post('/apply', authenticate, requireVerifiedEmail, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (existing && APPLICATION_BLOCKED_STATUSES.includes(existing.status)) {
    return res.status(409).json({
      error: { code: 'APPLICATION_LOCKED', message: `Your application is ${existing.status.toLowerCase().replace('_', ' ')}` },
    });
  }

  const patch = VendorApplicationPatchSchema.parse(req.body);

  const business = patch.business ?? {};
  const store = patch.store ?? {};
  const operations = patch.operations ?? {};
  const payout = patch.payout ?? {};

  let vendor = existing;
  if (!vendor) {
    const baseSlug = slugify(store.storeName || '') || 'store';
    const slugTaken = await prisma.vendorProfile.findUnique({ where: { slug: baseSlug } });
    vendor = await prisma.vendorProfile.create({
      data: {
        userId: req.user!.id,
        storeName: store.storeName || 'Unnamed store',
        slug: slugTaken ? `${baseSlug}-${Date.now()}` : baseSlug,
      },
    });
  } else if (store.storeName && store.storeName !== vendor.storeName && vendor.status === 'PENDING') {
    const baseSlug = slugify(store.storeName);
    const slugTaken = await prisma.vendorProfile.findFirst({ where: { slug: baseSlug, id: { not: vendor.id } } });
    await prisma.vendorProfile.update({
      where: { id: vendor.id },
      data: { storeName: store.storeName, slug: slugTaken ? `${baseSlug}-${Date.now()}` : baseSlug },
    });
  }

  vendor = await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: {
      ...(business.businessLegalName !== undefined && { businessLegalName: business.businessLegalName }),
      ...(business.businessType !== undefined && { businessType: business.businessType }),
      ...(business.registrationNumber !== undefined && { registrationNumber: business.registrationNumber }),
      ...(business.taxId !== undefined && { taxId: business.taxId }),
      ...(business.countryOfRegistration !== undefined && { countryOfRegistration: business.countryOfRegistration }),
      ...(business.website !== undefined && { website: business.website }),
      ...(store.description !== undefined && { description: store.description }),
      ...(store.supportEmail !== undefined && { supportEmail: store.supportEmail }),
      ...(store.supportPhone !== undefined && { supportPhone: store.supportPhone }),
      ...(store.returnPolicy !== undefined && { returnPolicy: store.returnPolicy }),
      ...(store.shippingPolicy !== undefined && { shippingPolicy: store.shippingPolicy }),
      ...(operations.warehouseRegionKey !== undefined && { warehouseRegionKey: operations.warehouseRegionKey }),
      ...(operations.plannedCategories !== undefined && { plannedCategories: JSON.stringify(operations.plannedCategories) }),
      ...(Object.keys(payout).length > 0
        ? {
            payoutMethod: JSON.stringify({
              ...safeParse(vendor.payoutMethod),
              ...(payout.type !== undefined && { type: payout.type }),
              ...(payout.bankName !== undefined && { bankName: payout.bankName }),
              ...(payout.accountLast4 !== undefined && { accountLast4: payout.accountLast4 }),
              ...(payout.paypalEmail !== undefined && { paypalEmail: payout.paypalEmail }),
              acceptedTermsAt: payout.acceptTerms ? new Date().toISOString() : safeParse(vendor.payoutMethod)?.acceptedTermsAt,
              acceptTerms: payout.acceptTerms === true ? true : safeParse(vendor.payoutMethod)?.acceptTerms === true,
            }),
          }
        : {}),
      onboardingStep: patch.step,
    },
  });

  res.json({ vendor, application: applicationSnapshot(vendor) });
});

function safeParse(json: string | null): any {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

async function commissionPctForRegion(): Promise<number> {
  const row = await prisma.platformConfig.findUnique({ where: { key: 'vendorCommissionPct' } });
  return row ? Number(row.value) : 12;
}

router.post('/me/documents', authenticate, requireVerifiedEmail, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    name: z.string().min(1).max(200),
    contentType: z.string().regex(/^[\w.-]+\/[\w.+*-]+$/).max(100),
    dataBase64: z.string().min(1).max(MAX_DOCUMENT_BYTES * 1.4),
  }).parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.id } });
  if (!vendor) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No seller application in progress' } });
  }

  const docs = parseDocuments(vendor.documents);
  if (docs.length >= 10) {
    return res.status(409).json({ error: { code: 'TOO_MANY_DOCUMENTS', message: 'Up to 10 documents per application' } });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.dataBase64, 'base64');
  } catch {
    return res.status(400).json({ error: { code: 'INVALID_BASE64', message: 'Document payload is not valid base64' } });
  }
  if (buffer.length === 0 || buffer.length > MAX_DOCUMENT_BYTES) {
    return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Documents must be between 1 byte and 5 MB' } });
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    return res.status(503).json({
      error: { code: 'STORAGE_NOT_CONFIGURED', message: 'Document storage is not available in this environment' },
    });
  }

  const { BlobServiceClient } = await import('@azure/storage-blob');
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = serviceClient.getContainerClient(KYC_CONTAINER);
  await containerClient.createIfNotExists({ access: undefined });

  const blobName = `${vendor.id}/${Date.now()}-${slugify(body.name.replace(/\.[^.]+$/, ''))}${body.name.match(/\.[^.]+$/)?.[0] ?? ''}`;
  const blockBlob = containerClient.getBlockBlobClient(blobName);
  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: body.contentType },
  });

  const doc: StoredDocument = {
    name: body.name,
    blob: blobName,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  };
  await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: { documents: JSON.stringify([...docs, doc]) },
  });

  res.status(201).json({ document: { name: doc.name, size: doc.size, uploadedAt: doc.uploadedAt } });
});

router.get('/me/documents', authenticate, async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: req.user!.id }, select: { documents: true } });
  if (!vendor) {
    return res.json({ documents: [] });
  }
  res.json({
    documents: parseDocuments(vendor.documents).map(d => ({ name: d.name, size: d.size, uploadedAt: d.uploadedAt })),
  });
});

router.post('/apply/submit', authenticate, requireVerifiedEmail, async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'No application in progress — start with POST /vendors/apply' },
    });
  }

  if (APPLICATION_BLOCKED_STATUSES.includes(vendor.status)) {
    return res.status(409).json({
      error: { code: 'APPLICATION_LOCKED', message: `Your application is already ${vendor.status.toLowerCase().replace('_', ' ')}` },
    });
  }

  const plannedCategories = safeParse(vendor.plannedCategories);
  const payout = safeParse(vendor.payoutMethod);
  const missing: string[] = [];
  if (!vendor.businessLegalName) missing.push('businessLegalName');
  if (!vendor.businessType) missing.push('businessType');
  if (!vendor.registrationNumber) missing.push('registrationNumber');
  if (!vendor.countryOfRegistration) missing.push('countryOfRegistration');
  if (!vendor.description || vendor.description.length < 20) missing.push('description');
  if (!vendor.supportEmail) missing.push('supportEmail');
  if (!Array.isArray(plannedCategories) || plannedCategories.length === 0) missing.push('plannedCategories');
  if (!(payout.type === 'bank' ? payout.bankName && payout.accountLast4 : payout.paypalEmail)) missing.push('payoutMethod');
  if (payout.acceptTerms !== true) missing.push('acceptTerms');

  if (missing.length > 0) {
    return res.status(422).json({
      error: { code: 'APPLICATION_INCOMPLETE', message: 'Missing required information', details: missing },
    });
  }

  const commissionPct = await commissionPctForRegion();
  const updated = await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: {
      status: 'UNDER_REVIEW',
      revenueSharePct: commissionPct,
      submittedAt: new Date(),
      onboardingStep: 4,
      kycData: JSON.stringify({
        businessType: vendor.businessType,
        taxId: vendor.taxId,
        website: vendor.website,
      }),
    },
  });

  await sendVendorSubmittedMail(req.user!.id, updated.storeName);

  res.json({ vendor: updated, application: applicationSnapshot(updated) });
});

async function sendVendorSubmittedMail(userId: string, storeName: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const { sendMail } = await import('../lib/mailer.js');
    await sendMail({
      to: user.email,
      subject: 'We received your Storegrill seller application',
      text: `Thanks for applying to sell "${storeName}" on Storegrill. Our team reviews new applications within two working days — we will email you the decision.`,
    });
  } catch (err) {
    console.error('[mail] vendor submission notice failed:', err);
  }
}

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  res.json({ vendor: { ...vendor, rating: Number(vendor.rating), plannedCategories: safeParse(vendor.plannedCategories), payoutMethod: safeParse(vendor.payoutMethod) } });
});
router.put('/me', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = UpdateVendorSchema.parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const updated = await prisma.vendorProfile.update({
    where: { id: vendor.id },
    data: {
      ...(body.storeName && { storeName: body.storeName }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.logo !== undefined && { logo: body.logo }),
      ...(body.banner !== undefined && { banner: body.banner }),
      ...(body.returnPolicy !== undefined && { returnPolicy: body.returnPolicy }),
      ...(body.shippingPolicy !== undefined && { shippingPolicy: body.shippingPolicy }),
      ...(body.supportEmail !== undefined && { supportEmail: body.supportEmail }),
      ...(body.supportPhone !== undefined && { supportPhone: body.supportPhone }),
    },
    select: {
      id: true, storeName: true, slug: true, logo: true, banner: true,
      description: true, status: true, rating: true,
    },
  });

  res.json({ vendor: { ...updated, rating: Number(updated.rating) } });
});

router.get('/me/products', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { name: true } } },
  });

  res.json({
    products: products.map((p: any) => ({
      ...p,
      basePriceMinorUnits: Number(p.basePriceMinorUnits),
      images: typeof p.images === 'string' ? JSON.parse(p.images) : p.images,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : p.tags,
    })),
  });
});
router.put('/me/products/:id/stock', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = z.object({ stock: z.number().int().min(0).max(1000000) }).parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const product = await prisma.product.findFirst({
    where: { id: req.params.id, vendorId: vendor.id },
    include: { variants: { take: 1 } },
  });

  if (!product) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Product not found in your catalog' },
    });
  }

  const variant = product.variants[0];
  const previousStock = variant?.stock ?? 0;

  if (variant) {
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: body.stock },
    });
  }

  const warehouse = await prisma.warehouse.findFirst({ where: { regionKey: 'UK', active: true } });
  if (!warehouse) {
    const created = await prisma.warehouse.create({
      data: { name: 'Primary Warehouse', regionKey: 'UK' },
    });
    await prisma.inventoryLedger.create({
      data: {
        productId: product.id,
        variantId: variant?.id,
        warehouseId: created.id,
        quantity: body.stock - previousStock,
        reason: 'VENDOR_ADJUSTMENT',
      },
    });
  } else {
    await prisma.inventoryLedger.create({
      data: {
        productId: product.id,
        variantId: variant?.id,
        warehouseId: warehouse.id,
        quantity: body.stock - previousStock,
        reason: 'VENDOR_ADJUSTMENT',
      },
    });
  }

  res.json({ productId: product.id, previousStock, stock: body.stock });
});
router.get('/me/orders', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const query = z.object({
    status: z.string().optional(),
    q: z.string().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  }).parse(req.query);

  const itemWhere: Prisma.OrderItemWhereInput = {
    vendorId: vendor.id,
    ...(query.q ? { OR: [
      { name: { contains: query.q } },
      { sku: { contains: query.q } },
      { order: { orderNumber: { contains: query.q } } },
    ] } : {}),
  };

  const items = await prisma.orderItem.findMany({
    where: itemWhere,
    select: { orderId: true, totalMinorUnits: true, quantity: true, order: { select: { status: true } } },
  });

  const byOrder = new Map<string, { itemCount: number; itemTotal: number; status: string }>();
  for (const it of items) {
    const agg = byOrder.get(it.orderId) ?? { itemCount: 0, itemTotal: 0, status: it.order.status };
    agg.itemCount += 1;
    agg.itemTotal += Number(it.totalMinorUnits);
    if (query.status) {
      // keep only orders whose status matches filter
    }
    byOrder.set(it.orderId, agg);
  }

  let entries = [...byOrder.entries()];
  if (query.status) {
    const filtered = await prisma.order.findMany({ where: { id: { in: entries.map(([id]) => id) }, status: query.status }, select: { id: true } });
    const allowed = new Set(filtered.map((o: any) => o.id));
    entries = entries.filter(([id]) => allowed.has(id));
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const paged = entries.slice((query.page - 1) * query.limit, query.page * query.limit);

  const orders = await prisma.order.findMany({
    where: { id: { in: paged.map(([id]) => id) } },
    include: {
      user: { select: { name: true, email: true } },
      shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const orderMap = new Map(orders.map((o: any) => [o.id, o]));

  res.json({
    orders: paged.flatMap(([orderId, agg]) => {
      const o = orderMap.get(orderId);
      if (!o) return [];
      return [{
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: o.createdAt,
        regionKey: o.regionKey,
        currencyCode: o.currencyCode,
        customerName: o.user?.name || o.user?.email || 'Customer',
        itemCount: agg.itemCount,
        vendorTotalMinorUnits: agg.itemTotal,
        trackingNumber: o.shipments[0]?.trackingNumber ?? null,
        shipmentStatus: o.shipments[0]?.status ?? null,
      }];
    }),
    pagination: { page: query.page, limit: query.limit, total: entries.length, totalPages: Math.max(1, Math.ceil(entries.length / query.limit)) },
  });
});

router.get('/me/orders/:id', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, items: { some: { vendorId: vendor.id } } },
    include: {
      user: { select: { name: true, email: true } },
      items: { where: { vendorId: vendor.id } },
      shipments: { include: { events: { orderBy: { timestamp: 'asc' } } } },
    },
  });

  if (!order) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Order not found for this store' },
    });
  }

  res.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      regionKey: order.regionKey,
      currencyCode: order.currencyCode,
      customerName: order.user?.name || order.user?.email || 'Customer',
      customerEmail: order.user?.email,
      shippingAddress: JSON.parse(order.shippingAddress || '{}'),
      notes: order.notes,
      items: order.items.map((i: any) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        image: i.image,
        quantity: i.quantity,
        unitPriceMinorUnits: Number(i.unitPriceMinorUnits),
        totalMinorUnits: Number(i.totalMinorUnits),
      })),
      shipments: order.shipments.map((s: any) => ({
        id: s.id,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        status: s.status,
        estimatedDelivery: s.estimatedDelivery,
        events: s.events.map((e: any) => ({ id: e.id, status: e.status, description: e.description, timestamp: e.timestamp })),
      })),
    },
  });
});

router.post('/me/orders/:id/ship', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const body = z.object({
    trackingNumber: z.string().max(200).optional(),
    carrier: z.string().max(100).optional(),
  }).parse(req.body);

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, items: { some: { vendorId: vendor.id } } },
    include: { items: { select: { vendorId: true } } },
  });

  if (!order) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Order not found for this store' },
    });
  }

  const carrier = body.carrier?.trim() || 'Regional Carrier';
  const now = new Date();

  const existingShipment = await prisma.shipment.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
  });

  const shipment = existingShipment
    ? await prisma.shipment.update({
        where: { id: existingShipment.id },
        data: { status: 'SHIPPED', carrier, trackingNumber: body.trackingNumber, updatedAt: now },
      })
    : await prisma.shipment.create({
        data: {
          orderId: order.id,
          carrier,
          trackingNumber: body.trackingNumber,
          status: 'SHIPPED',
          shippingAddress: order.shippingAddress,
          costMinorUnits: 0,
        },
      });

  await prisma.shipmentEvent.create({
    data: {
      shipmentId: shipment.id,
      status: 'SHIPPED',
      description: body.trackingNumber ? `Shipped with tracking ${body.trackingNumber}` : 'Marked as shipped',
    },
  });

  const allVendorIds = [...new Set(order.items.map((i: any) => i.vendorId))];
  const shippedCount = await prisma.shipment.count({ where: { orderId: order.id, status: 'SHIPPED' } });
  const fullyShipped = shippedCount >= allVendorIds.length;

  const updated = fullyShipped && ['PAID', 'PROCESSING'].includes(order.status)
    ? await prisma.order.update({ where: { id: order.id }, data: { status: 'SHIPPED' } })
    : order;

  res.json({
    shipment: { id: shipment.id, status: shipment.status, carrier: shipment.carrier, trackingNumber: shipment.trackingNumber },
    orderStatus: updated.status,
  });
});

router.get('/me/payouts', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const payouts = await prisma.payout.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { lines: true } } },
  });

  res.json({
    payouts: payouts.map((p: any) => ({
      ...p,
      amountMinorUnits: Number(p.amountMinorUnits),
      lineCount: p._count.lines,
    })),
  });
});
router.get('/me/dashboard', authenticate, authorize('VENDOR'), async (req: AuthRequest, res: Response) => {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor profile not found' },
    });
  }

  const [productCount, orderCount, totalRevenue, recentOrders, payoutSummary] = await Promise.all([
    prisma.product.count({ where: { vendorId: vendor.id } }),
    prisma.orderItem.count({ where: { vendorId: vendor.id } }),
    prisma.orderItem.aggregate({
      where: { vendorId: vendor.id, order: { status: 'DELIVERED' } },
      _sum: { totalMinorUnits: true },
    }),
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id },
      orderBy: { order: { createdAt: 'desc' } },
      take: 10,
      include: {
        order: { select: { orderNumber: true, status: true, createdAt: true } },
        product: { select: { thumbnail: true } },
      },
    }),
    prisma.payout.aggregate({
      where: { vendorId: vendor.id, status: 'PAID' },
      _sum: { amountMinorUnits: true },
    }),
  ]);

  res.json({
    dashboard: {
      productCount,
      orderCount,
      totalRevenue: Number(totalRevenue._sum.totalMinorUnits || 0),
      totalPayouts: Number(payoutSummary._sum.amountMinorUnits || 0),
      recentOrders: recentOrders.map((o: any) => ({
        ...o,
        unitPriceMinorUnits: Number(o.unitPriceMinorUnits),
        totalMinorUnits: Number(o.totalMinorUnits),
      })),
    },
  });
});

router.get('/:slug', async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  const vendor = await prisma.vendorProfile.findUnique({
    where: { slug },
    select: {
      id: true, storeName: true, slug: true, logo: true, banner: true,
      description: true, returnPolicy: true, shippingPolicy: true,
      supportEmail: true, supportPhone: true, rating: true, reviewCount: true,
      status: true, kycStatus: true,
      createdAt: true,
      user: { select: { name: true } },
      products: {
        where: { status: 'ACTIVE' },
        take: 20,
        orderBy: { totalSales: 'desc' },
        select: {
          id: true, name: true, slug: true, thumbnail: true,
          basePriceMinorUnits: true, currencyCode: true, rating: true,
          reviewCount: true,
        },
      },
    },
  });

  if (!vendor) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Vendor not found' },
    });
  }

  res.json({
    vendor: {
      ...vendor,
      rating: Number(vendor.rating),
      products: vendor.products.map((p: any) => ({
        ...p,
        basePriceMinorUnits: Number(p.basePriceMinorUnits),
        rating: Number(p.rating),
      })),
    },
  });
});

export { router as vendorsRouter };
