import { z } from 'zod';

// The homepage is a stream of modules composed by the API for one region.
// Every tile is backed by a real product/ldeal row so the storefront never
// advertises a price, discount or link that Storegrill cannot honour.

export const HomeTileSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  image: z.string().optional(),
  priceMinorUnits: z.number().int().nonnegative(),
  listPriceMinorUnits: z.number().int().nonnegative().optional(),
  currencyCode: z.string(),
});

export const HomeCategoryModuleSchema = z.object({
  kind: z.literal('category'),
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  tiles: z.array(HomeTileSchema).min(1).max(4),
});

export const HomeDealItemSchema = z.object({
  dealId: z.string(),
  dealSlug: z.string(),
  name: z.string(),
  image: z.string().optional(),
  priceMinorUnits: z.number().int().nonnegative(),
  listPriceMinorUnits: z.number().int().nonnegative(),
  discountPercent: z.number().int().min(1).max(100),
  cap: z.boolean(),
  endsAt: z.string(),
  currencyCode: z.string(),
});

export const HomeDealsModuleSchema = z.object({
  kind: z.literal('deals'),
  headingKey: z.string(),
  items: z.array(HomeDealItemSchema).min(1),
});

export const HomeCreativeModuleSchema = z.object({
  kind: z.literal('creative'),
  id: z.string(),
  titleKey: z.string(),
  bodyKey: z.string(),
  ctaKey: z.string(),
  href: z.string(),
  theme: z.enum(['dark', 'light']),
});

export const HomeRecentlyModuleSchema = z.object({
  kind: z.literal('recently'),
});

export const HomeModuleSchema = z.discriminatedUnion('kind', [
  HomeCategoryModuleSchema,
  HomeDealsModuleSchema,
  HomeCreativeModuleSchema,
  HomeRecentlyModuleSchema,
]);

export const HomeHeroSlideSchema = z.object({
  id: z.string(),
  variant: z.enum(['deal', 'brand']),
  title: z.string(),
  titleIsKey: z.boolean(),
  discountPercent: z.number().int().min(1).max(100).optional(),
  cap: z.boolean().optional(),
  endsAt: z.string().optional(),
  image: z.string().optional(),
  ctaHref: z.string(),
  ctaKey: z.string(),
});

export const HomeFeedSchema = z.object({
  regionKey: z.string(),
  currencyCode: z.string(),
  hero: z.array(HomeHeroSlideSchema),
  modules: z.array(HomeModuleSchema),
  page: z.number().int().nonnegative(),
  more: z.boolean(),
});

export type HomeTile = z.infer<typeof HomeTileSchema>;
export type HomeCategoryModule = z.infer<typeof HomeCategoryModuleSchema>;
export type HomeDealItem = z.infer<typeof HomeDealItemSchema>;
export type HomeDealsModule = z.infer<typeof HomeDealsModuleSchema>;
export type HomeCreativeModule = z.infer<typeof HomeCreativeModuleSchema>;
export type HomeRecentlyModule = z.infer<typeof HomeRecentlyModuleSchema>;
export type HomeModule = z.infer<typeof HomeModuleSchema>;
export type HomeHeroSlide = z.infer<typeof HomeHeroSlideSchema>;
export type HomeFeed = z.infer<typeof HomeFeedSchema>;