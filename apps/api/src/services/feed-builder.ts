import { prisma } from '../db/prisma.js';
import { resolveProductPricing } from '../utils/pricing.js';
import { loadActiveDeals } from './deal-eval.js';
import { DEFAULT_REGIONS } from '@Storegrill/shared';

const PAGE_SIZE = 500;

const APEX_DOMAIN = process.env.APEX_DOMAIN || 'Storegrill.net';

export type FeedChannel = 'google-merchant' | 'facebook' | 'tiktok' | 'pinterest';

export interface FeedItem {
  id: string;
  itemGroupId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  priceMinorUnits: number;
  currencyCode: string;
  listPriceMinorUnits?: number;
  availability: 'in_stock' | 'out_of_stock';
  condition: 'new';
  brand: string;
  gtin?: string;
  mpn?: string;
  googleProductCategory?: string;
  productType?: string;
  shipping?: { country: string; priceMinorUnits: number; currencyCode: string };
}

function parseStringList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

const CATEGORY_TO_GOOGLE: Record<string, string> = {
  'Home & Garden': 'Home & Garden',
  'Home': 'Home & Garden',
  'Furniture': 'Home & Garden > Furniture',
  'Garden & Outdoor': 'Home & Garden > Outdoor Living',
  'Garden': 'Home & Garden > Outdoor Living',
  'Outdoor': 'Home & Garden > Outdoor Living',
  'Sports': 'Sporting Goods',
  'Sports & Outdoors': 'Sporting Goods',
  'Fitness': 'Sporting Goods > Exercise & Fitness',
  'Baby': 'Baby & Toddler',
  'Kids': 'Toys & Games',
  'Toys': 'Toys & Games',
  'Electronics': 'Electronics',
  'Appliances': 'Electronics > Electronics Accessories',
  'Kitchen': 'Home & Garden > Kitchen & Dining',
  'Tools': 'Hardware > Tools',
  'Auto': 'Vehicles & Parts',
  'Pet': 'Animals & Pet Supplies',
  'Health': 'Health & Beauty',
  'Beauty': 'Health & Beauty',
  'Clothing': 'Apparel & Accessories > Clothing',
  'Jewelry & Accessories': 'Apparel & Accessories > Jewelry',
  'Office': 'Office Supplies',
  'Stationery': 'Office Supplies > Stationery',
  'Storage & Organization': 'Home & Garden > Storage & Organization',
  'Decor': 'Home & Garden > Decor',
  'Lighting': 'Home & Garden > Lighting',
};

function regionFromConfig(regionKey: string) {
  return DEFAULT_REGIONS.find(r => r.key === regionKey) || DEFAULT_REGIONS[0];
}

function imagesArray(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((i): i is string => typeof i === 'string' && i.length > 0);
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed.filter((i): i is string => typeof i === 'string' && i.length > 0);
    } catch {
      return images.trim() ? [images.trim()] : [];
    }
  }
  return [];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatMinorUnits(minorUnits: number, currencyCode: string): string {
  const amount = (Number(minorUnits) / 100).toFixed(2);
  return `${amount} ${currencyCode}`;
}

function availabilityOf(product: {
  variants?: { stock: number | bigint }[];
}): 'in_stock' | 'out_of_stock' {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const inStock = variants.some(v => Number(v.stock) > 0);
  if (inStock) return 'in_stock';
  return variants.length === 0 ? 'in_stock' : 'out_of_stock';
}

function googleProductCategoryFor(productType: string | undefined): string | undefined {
  if (!productType) return undefined;
  const direct = CATEGORY_TO_GOOGLE[productType];
  if (direct) return direct;
  const loose = Object.entries(CATEGORY_TO_GOOGLE).find(([key]) =>
    productType.toLowerCase().includes(key.toLowerCase()),
  );
  return loose?.[1];
}

function productImages(product: { images: unknown; thumbnail?: string | null }): string[] {
  return imagesArray(product.images);
}

function buildItem(
  product: any,
  regionKey: string,
  regionDefaultCurrency: string,
  activeDeals: any[],
  shipping?: { country: string; priceMinorUnits: number; currencyCode: string },
): FeedItem {
  const pricing = resolveProductPricing(product, regionKey, activeDeals);
  const currencyCode = pricing.currencyCode || regionDefaultCurrency;
  const images = productImages(product);
  const brand =
    product.brand?.name ||
    product.vendor?.storeName ||
    'Storegrill';
  const productType = product.category?.name || undefined;
  const googleProductCategory = googleProductCategoryFor(productType);
  const link = `https://${regionKey.toLowerCase()}.${APEX_DOMAIN}/products/${product.slug}`;

  return {
    id: String(product.sku || product.id),
    itemGroupId: String(product.id),
    title: product.name,
    description: (product.shortDescription || product.description || '').slice(0, 5000),
    link,
    imageLink: images[0] || product.thumbnail || '',
    additionalImageLinks: images.slice(1),
    priceMinorUnits: pricing.price,
    currencyCode,
    listPriceMinorUnits: pricing.listPriceMinorUnits,
    availability: availabilityOf(product),
    condition: 'new',
    brand,
    gtin: product.barcode || undefined,
    mpn: product.sku || undefined,
    googleProductCategory,
    productType,
    shipping,
  };
}

async function regionShipping(regionKey: string) {
  const region = await prisma.region.findUnique({
    where: { key: regionKey },
    select: { defaultCurrency: true, shippingZones: { where: { enabled: true }, take: 1 } },
  });
  if (!region?.shippingZones?.[0]) return undefined;
  const zone = region.shippingZones[0] as any;
  return {
    country: parseStringList(zone.countries)[0] || regionKey,
    priceMinorUnits: Number(zone.baseRateMinorUnits || 0),
    currencyCode: zone.currencyCode || region.defaultCurrency,
  };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise(resolve => setTimeout(resolve, 2500 * attempt));
      }
    }
  }
  throw lastError;
}

export async function loadFeedItems(regionKey: string): Promise<FeedItem[]> {
  const region = regionFromConfig(regionKey);
  const regionDefaultCurrency = region.defaultCurrency;
  const shipping = await withRetry(() => regionShipping(regionKey));
  const activeDeals = await withRetry(() => loadActiveDeals(prisma));

  const items: FeedItem[] = [];
  let cursorId: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const batch = await withRetry(() =>
      prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          ...(cursorId ? { id: { gt: cursorId } } : {}),
        },
        orderBy: { id: 'asc' },
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          barcode: true,
          description: true,
          shortDescription: true,
          thumbnail: true,
          images: true,
          basePriceMinorUnits: true,
          currencyCode: true,
          attributes: true,
          vendorId: true,
          brand: { select: { name: true } },
          vendor: { select: { storeName: true } },
          category: { select: { name: true } },
          regionPrices: { where: { regionKey }, take: 1 },
          variants: { select: { id: true, stock: true }, take: 500 },
        },
      }),
    );

    for (const product of batch) {
      const item = buildItem(product, regionKey, regionDefaultCurrency, activeDeals, shipping);
      if (item.priceMinorUnits > 0) items.push(item);
    }

    if (batch.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      cursorId = batch[batch.length - 1].id;
    }
  }

  return items;
}

export function renderGoogleMerchant(items: FeedItem[], regionKey: string, regionName: string): string {
  const published = new Date().toISOString();
  const channelName = `Storegrill ${regionName} Product Feed`;
  const rows = items.map(item => {
    const priceTag = `<g:price>${formatMinorUnits(item.priceMinorUnits, item.currencyCode)}</g:price>`;
    const saleTag =
      item.listPriceMinorUnits && item.listPriceMinorUnits > item.priceMinorUnits
        ? `<g:sale_price>${formatMinorUnits(item.priceMinorUnits, item.currencyCode)}</g:sale_price>`
        : '';
    const shippingTag = item.shipping
      ? `<g:shipping><g:country>${escapeXml(item.shipping.country)}</g:country><g:price>${formatMinorUnits(
          item.shipping.priceMinorUnits,
          item.shipping.currencyCode,
        )}</g:price></g:shipping>`
      : '';
    return [
      `<item>`,
      `<g:id>${escapeXml(item.id)}</g:id>`,
      `<g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>`,
      `<g:title>${escapeXml(item.title)}</g:title>`,
      `<g:description>${escapeXml(item.description)}</g:description>`,
      `<g:link>${escapeXml(item.link)}</g:link>`,
      `<g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
      ...item.additionalImageLinks.map(url => `<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`),
      `<g:availability>${item.availability}</g:availability>`,
      `<g:condition>${item.condition}</g:condition>`,
      priceTag,
      saleTag,
      `<g:brand>${escapeXml(item.brand)}</g:brand>`,
      ...(item.gtin ? [`<g:gtin>${escapeXml(item.gtin)}</g:gtin>`] : []),
      ...(item.mpn ? [`<g:mpn>${escapeXml(item.mpn)}</g:mpn>`] : []),
      ...(item.googleProductCategory
        ? [`<g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>`]
        : []),
      ...(item.productType ? [`<g:product_type>${escapeXml(item.productType)}</g:product_type>`] : []),
      shippingTag,
      `</item>`,
    ].filter(line => line !== '').join('');
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`,
    `<channel>`,
    `<title>${escapeXml(channelName)}</title>`,
    `<link>https://${regionKey.toLowerCase()}.${APEX_DOMAIN}</link>`,
    `<description>${escapeXml(channelName)}</description>`,
    `<lastBuildDate>${published}</lastBuildDate>`,
    rows.join(''),
    `</channel>`,
    `</rss>`,
  ].join('\n');
}

function csvCell(value: string | number | undefined): string {
  const raw = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

const TIKTOK_HEADER = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'gtin',
  'mpn',
  'google_product_category',
  'item_group_id',
];

export function renderTikTokCsv(items: FeedItem[]): string {
  const rows = items.map(item => [
    item.id,
    item.title,
    item.description,
    item.availability,
    item.condition,
    `${(Number(item.priceMinorUnits) / 100).toFixed(2)} ${item.currencyCode}`,
    item.link,
    item.imageLink,
    item.additionalImageLinks.join(','),
    item.brand,
    item.gtin || '',
    item.mpn || '',
    item.googleProductCategory || '',
    item.itemGroupId,
  ]);
  return [TIKTOK_HEADER.join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');
}

const PINTEREST_HEADER = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'additional_image_link',
  'price',
  'availability',
  'condition',
  'brand',
  'gtin',
  'mpn',
  'google_product_category',
  'item_group_id',
];

export function renderPinterestCsv(items: FeedItem[]): string {
  const rows = items.map(item => [
    item.id,
    item.title,
    item.description,
    item.link,
    item.imageLink,
    item.additionalImageLinks.join(','),
    `${(Number(item.priceMinorUnits) / 100).toFixed(2)} ${item.currencyCode}`,
    item.availability,
    item.condition,
    item.brand,
    item.gtin || '',
    item.mpn || '',
    item.googleProductCategory || '',
    item.itemGroupId,
  ]);
  return [PINTEREST_HEADER.join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');
}

const FACEBOOK_HEADER = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'additional_image_link',
  'brand',
  'gtin',
  'mpn',
  'google_product_category',
  'item_group_id',
  'sale_price',
];

export function renderFacebookCsv(items: FeedItem[]): string {
  const rows = items.map(item => [
    item.id,
    item.title,
    item.description,
    item.availability,
    item.condition,
    `${(Number(item.priceMinorUnits) / 100).toFixed(2)} ${item.currencyCode}`,
    item.link,
    item.imageLink,
    item.additionalImageLinks.join(','),
    item.brand,
    item.gtin || '',
    item.mpn || '',
    item.googleProductCategory || '',
    item.itemGroupId,
    item.listPriceMinorUnits && item.listPriceMinorUnits > item.priceMinorUnits
      ? `${(Number(item.priceMinorUnits) / 100).toFixed(2)} ${item.currencyCode}`
      : '',
  ]);
  return [FACEBOOK_HEADER.join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n');
}

import { cache, TTL } from '../lib/cache.js';
import { recordFeedGeneration } from './feed-log.js';

export async function buildFeed(regionKey: string, channel: FeedChannel): Promise<string> {
  const cacheKey = `feed:${regionKey}:${channel}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) return cached;

  const startedAt = Date.now();
  let items: FeedItem[] = [];
  try {
    items = await loadFeedItems(regionKey);
    const region = regionFromConfig(regionKey);
    let feed: string;

    switch (channel) {
      case 'google-merchant':
        feed = renderGoogleMerchant(items, regionKey, region.name);
        break;
      case 'facebook':
        feed = renderFacebookCsv(items);
        break;
      case 'tiktok':
        feed = renderTikTokCsv(items);
        break;
      case 'pinterest':
        feed = renderPinterestCsv(items);
        break;
    }

    cache.set(cacheKey, feed, TTL.feeds);
    void recordFeedGeneration({
      regionKey,
      channel,
      status: 'SUCCESS',
      itemCount: items.length,
      durationMs: Date.now() - startedAt,
    }).catch(() => undefined);
    return feed;
  } catch (error) {
    void recordFeedGeneration({
      regionKey,
      channel,
      status: 'FAILED',
      itemCount: items.length,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown feed build error',
    }).catch(() => undefined);
    throw error;
  }
}