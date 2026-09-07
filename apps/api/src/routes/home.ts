import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { getCategoryTree } from '../services/categories.js';
import { dealPriceFor, resolveListPrice } from '../services/deal-pricing.js';

const router = Router();
const DEFAULT_PAGE_SIZE = 3;
const DEAL_IMAGE_TYPES = new Set(['PERCENTAGE_OFF', 'FIXED_AMOUNT', 'FLASH_SALE']);

interface DealItem {
  dealId: string;
  dealSlug: string;
  name: string;
  image?: string;
  priceMinorUnits: number;
  listPriceMinorUnits: number;
  discountPercent: number;
  cap: boolean;
  endsAt: string;
  currencyCode: string;
}

function firstImage(product: any): string | undefined {
  const raw = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return typeof product.thumbnail === 'string' ? product.thumbnail : undefined;
}

function buildDealItem(deal: any, regionKey: string): DealItem | null {
  if (!DEAL_IMAGE_TYPES.has(deal.type)) return null;
  for (const v of deal.variants ?? []) {
    const product = v.product;
    if (!product) continue;
    const image = firstImage(product);
    if (!image) continue;
    const { listPriceMinorUnits: list, currencyCode } = resolveListPrice(product, regionKey);
    const pricing = dealPriceFor(deal.type, Number(deal.value), list);
    if (!pricing) continue;

    return {
      dealId: deal.id,
      dealSlug: deal.slug,
      name: product.name,
      image,
      priceMinorUnits: pricing.priceMinorUnits,
      listPriceMinorUnits: list,
      discountPercent: pricing.discountPercent,
      cap: typeof deal.maxDiscount === 'number' && deal.maxDiscount > 0,
      endsAt: new Date(deal.endsAt).toISOString(),
      currencyCode,
    };
  }
  return null;
}

router.get('/', async (req: Request, res: Response) => {
  const regionKey = (req.query.regionKey as string) || 'UK';
  const page = Math.max(0, Number(req.query.page) || 0);
  const pageSize = Math.max(1, Number(req.query.pageSize) || DEFAULT_PAGE_SIZE);

  const region = await prisma.region.findUnique({
    where: { key: regionKey },
    select: { defaultCurrency: true },
  });
  const currencyCode = region?.defaultCurrency || 'GBP';

  // 1. Category modules — top categories for this region, tiles are real
  //    featured products inside that category (region-priced).
  const roots = await getCategoryTree(prisma, {
    regionKey,
    includeProducts: true,
    orderBy: 'products',
  });
  const categoryModules = roots
    .map((root: any) => ({
      kind: 'category' as const,
      id: root.id,
      name: root.name,
      slug: root.slug,
      tiles: (root.featured || [])
        .filter((t: any) => t.thumbnail && t.price > 0)
        .map((t: any) => ({
          productId: t.id,
          slug: t.slug,
          name: t.name,
          image: t.thumbnail,
          priceMinorUnits: t.price,
          currencyCode: t.currencyCode,
        }))
        .slice(0, 4),
    }))
    .filter((m: any) => m.tiles.length > 0);

  // 2. Deals rail — every % derived from a live deal + the region price, so the
  //    storefront never invents a saving or advertises a dead product.
  const now = new Date();
  const deals = await prisma.deal.findMany({
    where: {
      enabled: true,
      status: 'LIVE',
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: [{ regionKey: null }, { regionKey }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      variants: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              thumbnail: true,
              images: true,
              basePriceMinorUnits: true,
              currencyCode: true,
              regionPrices: { where: { regionKey } },
            },
          },
        },
      },
    },
  });

  const dealItems: DealItem[] = [];
  for (const deal of deals) {
    const item = buildDealItem(deal, regionKey);
    if (item) dealItems.push(item);
  }

  const dealsModule =
    dealItems.length > 0
      ? { kind: 'deals' as const, headingKey: 'home.deals.heading', items: dealItems.slice(0, 12) }
      : null;

  // 3. Truthful editorial creatives — copy lives in i18n, links to real routes.
  const creatives = [
    {
      kind: 'creative' as const,
      id: 'acquisition',
      titleKey: 'home.creative.acquisition.title',
      bodyKey: 'home.creative.acquisition.body',
      ctaKey: 'home.creative.acquisition.cta',
      href: '/auth/signup',
      theme: 'dark' as const,
    },
    {
      kind: 'creative' as const,
      id: 'sell',
      titleKey: 'home.creative.sell.title',
      bodyKey: 'home.creative.sell.body',
      ctaKey: 'home.creative.sell.cta',
      href: '/sell',
      theme: 'light' as const,
    },
  ];

  const modules: Array<any> = [creatives[0], ...categoryModules];
  if (dealsModule) modules.push(dealsModule);
  modules.push(creatives[1], { kind: 'recently' });

  const start = page * pageSize;
  const slice = modules.slice(start, start + pageSize);
  const more = start + pageSize < modules.length;

  // Hero: honest deal slides first (real product art + real % + end date),
  // then the always-safe brand slide as a graceful fallback.
  const heroSlides: Array<any> = [];
  for (const item of dealItems.slice(0, 3)) {
    heroSlides.push({
      id: `deal-${item.dealId}`,
      variant: 'deal',
      title: item.name,
      titleIsKey: false,
      discountPercent: item.discountPercent,
      cap: item.cap,
      endsAt: item.endsAt,
      image: item.image,
      priceMinorUnits: item.priceMinorUnits,
      listPriceMinorUnits: item.listPriceMinorUnits,
      currencyCode: item.currencyCode,
      ctaHref: `/deals/${item.dealSlug}`,
      ctaKey: 'home.hero.shopNow',
    });
  }
  heroSlides.push({
    id: 'brand',
    variant: 'brand',
    title: 'home.hero.brand.title',
    titleIsKey: true,
    ctaHref: '/categories',
    ctaKey: 'home.hero.brand.cta',
  });

  res.json({
    regionKey,
    currencyCode,
    hero: page === 0 ? heroSlides : [],
    modules: slice,
    page,
    more,
  });
});

export { router as homeRouter };