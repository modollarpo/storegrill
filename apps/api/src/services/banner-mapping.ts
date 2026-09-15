export interface BannerContent {
  url?: unknown;
  blobUrl?: unknown;
  title?: unknown;
  subtitle?: unknown;
  href?: unknown;
  regionKey?: unknown;
  size?: unknown;
  order?: unknown;
  [key: string]: unknown;
}

export interface BannerSlide {
  title: string;
  subtitle: string;
  image: string;
  href: string;
  imageFit: 'contain' | 'cover';
  creativeId: string;
}

export interface BannerRow {
  id: string;
  name: string;
  content: string;
  createdAt?: Date | string;
}

export const HERO_MAX_BANNER_SLIDES = 14;

export function parseBannerContent(content: string): BannerContent {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? (parsed as BannerContent) : {};
  } catch {
    return {};
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function bannerOrder(row: BannerRow): number {
  const order = parseBannerContent(row.content).order;
  return typeof order === 'number' && Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

export function campaignCreativeToSlide(row: BannerRow, regionKey: string): BannerSlide | null {
  const content = parseBannerContent(row.content);

  const region = content.regionKey ? asString(content.regionKey) : null;
  if (region && region !== regionKey) return null;

  const image = typeof content.blobUrl === 'string' ? content.blobUrl : asString(content.url);
  if (!image) return null;

  const title = asString(content.title);
  const subtitle = asString(content.subtitle);
  const href = asString(content.href);
  if (!title || !subtitle || !href) return null;
  if (!href.startsWith('/')) return null;

  const imageFit: 'contain' | 'cover' = content.size === '1024x1024' ? 'contain' : 'cover';

  return { title, subtitle, image, href, imageFit, creativeId: row.id };
}