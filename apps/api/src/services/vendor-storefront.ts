import type { PrismaClient } from '@prisma/client';
import { parseStringList } from '@Storegrill/shared';

import { resolveProductPricing } from '../utils/pricing.js';
import { loadActiveDeals } from './deal-eval.js';

export const VENDOR_STOREFRONT_PRODUCT_LIMIT = 24;

interface VendorStorefrontProductRow {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  images: string;
  categoryId: string;
  vendorId: string;
  basePriceMinorUnits: number;
  currencyCode: string;
  rating: number;
  reviewCount: number;
  regionPrices: { regionKey: string; priceMinorUnits: number; currencyCode: string }[];
  variants: { attributes: string; stock: number }[];
}

export interface VendorStorefrontProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  images: string[];
  categoryId: string;
  basePriceMinorUnits: number;
  price: number;
  listPriceMinorUnits: number;
  originalPriceMinorUnits: number;
  discountPercent?: number;
  dealId?: string | null;
  dealType?: string | null;
  currencyCode: string;
  rating: number;
  reviewCount: number;
  inventoryCount: number;
}

export interface VendorStorefront {
  id: string;
  storeName: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  returnPolicy: string | null;
  shippingPolicy: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  rating: number;
  reviewCount: number;
  status: string;
  kycStatus: string;
  createdAt: Date;
  user: { name: string | null };
  products: VendorStorefrontProduct[];
}

export async function getVendorStorefront(
  prisma: PrismaClient,
  slug: string,
  regionKey: string,
  limit: number = VENDOR_STOREFRONT_PRODUCT_LIMIT,
): Promise<VendorStorefront | null> {
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
        take: limit,
        orderBy: { totalSales: 'desc' },
        select: {
          id: true, name: true, slug: true, thumbnail: true, images: true,
          categoryId: true, vendorId: true,
          basePriceMinorUnits: true, currencyCode: true, rating: true, reviewCount: true,
          regionPrices: { where: { regionKey }, take: 1 },
          variants: { select: { attributes: true, stock: true } },
        },
      },
    },
  });

  if (!vendor) return null;

  const activeDeals = await loadActiveDeals(prisma);
  const { products, ...profile } = vendor;

  return {
    ...profile,
    rating: Number(profile.rating),
    products: products.map((p: VendorStorefrontProductRow) => {
      const pricing = resolveProductPricing(p, regionKey, activeDeals);
      const listPriceMinorUnits = pricing.listPriceMinorUnits ?? pricing.price;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        thumbnail: p.thumbnail,
        images: parseStringList(p.images),
        categoryId: p.categoryId,
        basePriceMinorUnits: Number(p.basePriceMinorUnits),
        price: pricing.price,
        listPriceMinorUnits,
        originalPriceMinorUnits: listPriceMinorUnits,
        discountPercent: pricing.discountPercent,
        dealId: pricing.dealId ?? undefined,
        dealType: pricing.dealType ?? undefined,
        currencyCode: pricing.currencyCode,
        rating: Number(p.rating),
        reviewCount: p.reviewCount,
        inventoryCount: p.variants.reduce((sum: number, v: { stock: number }) => sum + v.stock, 0),
      };
    }),
  };
}
