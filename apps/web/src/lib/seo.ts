import type { Metadata } from 'next';
import { regionUrl, regionByKey, REGION_META, DEFAULT_REGION_KEY } from './regions';

const SITE_NAME = 'Storegrill';

// Title metadata is fully self-contained here: buildMetadata returns the
// complete "… | Storegrill" title so pages render identically with or
// without a layout template. cleanTitleBase strips any stray brand fragment
// a caller might still embed so it never renders twice.
function cleanTitleBase(raw: string): string {
  return raw.trim().replace(/\s*[|–—-]\s*Storegrill$/, '').trim();
}

function brandTitle(base: string): string {
  return `${cleanTitleBase(base)} | ${SITE_NAME}`;
}

// Short country token used in titles ("UK", "USA", "UAE") — matches how
// shoppers type local-intent queries and keeps titles concise.
export function seoCountryToken(key: string): string {
  const special: Record<string, string> = { AE: 'UAE', US: 'USA' };
  return special[key] || key;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max).trim()}…` : value;
}

function uniqueKeywords(values: string[]): string[] {
  return [...new Set(values.map(v => v.trim().toLowerCase()).filter(Boolean))];
}

export function absoluteUrl(path: string): string {
  return `https://${process.env.NEXT_PUBLIC_APEX_DOMAIN || 'Storegrill.net'}${path.startsWith('/') ? path : `/${path}`}`;
}

interface PageSeoOptions {
  title: string;
  description: string;
  path: string;
  regionKey: string;
  noIndex?: boolean;
  ogImage?: string;
  keywords?: string[];
}

export function buildMetadata({
  title,
  description,
  path,
  regionKey,
  noIndex = false,
  ogImage,
  keywords,
}: PageSeoOptions): Metadata {
  const region = regionByKey(regionKey);
  const baseTitle = cleanTitleBase(title);
  const fullTitle = brandTitle(baseTitle);
  const canonicalPath = path === '/' ? '/' : path.replace(/\/$/, '');
  const url = regionUrl(regionKey, canonicalPath);

  const languages: Record<string, string> = {};
  for (const r of REGION_META) {
    for (const lang of r.languages) {
      languages[lang.code] = regionUrl(r.key, canonicalPath);
    }
    languages[`x-${r.key.toLowerCase()}`] = regionUrl(r.key, canonicalPath);
  }

  return {
    title: brandTitle(baseTitle),
    description,
    ...(keywords && keywords.length ? { keywords } : {}),
    alternates: {
      canonical: url,
      languages,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url,
      locale: region.languages[0]?.code ?? 'en',
      images: [{ url: ogImage || '/banners/bannerOne.jpg', width: 1600, height: 900, alt: baseTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Storegrill',
      title: fullTitle,
      description,
      images: [ogImage || '/banners/bannerOne.jpg'],
    },
  };
}

function currencySymbol(currencyCode: string): string {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0)
      .find(part => part.type === 'currency')?.value || currencyCode
  );
}

export const SEO_DEFAULTS = {
  home: (regionKey: string) => {
    const region = regionByKey(regionKey);
    const short = seoCountryToken(region.key);
    const area = region.name.toLowerCase();
    return {
      title: `Online Shopping in ${short}`,
      description: `${region.name} online shopping for electronics, home, fashion, beauty and more. Compare prices from verified sellers on Storegrill and enjoy fast regional delivery, secure payments and easy returns.`,
      keywords: uniqueKeywords([
        `online shopping in ${area}`,
        `buy online in ${area}`,
        `online store ${short.toLowerCase()}`,
        `${area} marketplace`,
        'electronics', 'fashion', 'home & kitchen', 'beauty', 'deals', SITE_NAME,
      ]),
    };
  },
  search: (query?: string) => ({
    title: query ? `${query} — Search Results` : 'Search all products',
    description: `Browse search results${query ? ` for "${query}"` : ''} on Storegrill. Compare prices from multiple vendors, read reviews and buy with confidence.`,
  }),
  category: (slug: string, name: string, regionKey: string, categoryDescription?: string) => {
    const region = regionByKey(regionKey);
    const short = seoCountryToken(region.key);
    const nameLower = name.toLowerCase();
    const description =
      categoryDescription && categoryDescription.trim().length > 20
        ? `${categoryDescription.trim().replace(/\.$/, '')}. Shop ${name} in ${region.name}.`
        : `Buy ${name} online in ${region.name} at the best prices. Compare ${nameLower} from verified sellers, read real customer reviews and enjoy fast delivery with secure checkout on Storegrill.`;
    return {
      title: `Shop ${name} in ${short}`,
      description,
      keywords: uniqueKeywords([
        `${nameLower} ${short.toLowerCase()}`,
        `buy ${nameLower} ${short.toLowerCase()}`,
        `${nameLower} online`,
        `${nameLower} deals ${short.toLowerCase()}`,
        `cheap ${nameLower} ${short.toLowerCase()}`,
        `best ${nameLower} prices`,
      ]),
    };
  },
  allProducts: (regionKey: string) => {
    const region = regionByKey(regionKey);
    const short = seoCountryToken(region.key);
    return {
      title: 'All Products',
      description: `Shop all products online in ${region.name.toLowerCase()} on Storegrill — electronics, fashion, home, beauty and more with filters for price, rating, brand and seller.`,
      keywords: uniqueKeywords(['all products', `shop ${short.toLowerCase()} products online`, `${region.name.toLowerCase()} products`]),
    };
  },
  product: (name: string, price?: string, currency?: string, rating?: number, reviewCount?: number, regionKey = DEFAULT_REGION_KEY) => {
    const region = regionByKey(regionKey);
    const short = seoCountryToken(region.key);
    const area = region.name.toLowerCase();
    const nameLower = name.toLowerCase();
    const pricePart = price && currency ? `${currencySymbol(currency)}${price}` : null;
    const ratingPart =
      rating !== undefined && reviewCount !== undefined && reviewCount > 0
        ? ` Rated ${rating.toFixed(1)}/5 from ${reviewCount} reviews.`
        : '';
    const description = [
      pricePart ? `${pricePart} — ` : '',
      `Buy ${name} online in ${region.name}.`,
      ` Compare prices across verified sellers on Storegrill and get fast delivery, secure checkout and easy returns.${ratingPart}`,
    ].join('');
    return {
      title: `Buy ${truncate(name, 46)}`,
      description,
      keywords: uniqueKeywords([
        name,
        `buy ${nameLower} ${short.toLowerCase()}`,
        `buy ${nameLower} online`,
        `${nameLower} price in ${area}`,
        `cheap ${nameLower} ${short.toLowerCase()}`,
        `${nameLower} deals`,
      ]),
    };
  },
  deals: (regionKey?: string) => {
    const region = regionKey ? regionByKey(regionKey) : undefined;
    const short = region ? seoCountryToken(region.key) : '';
    return {
      title: `Today's Deals in ${short}`,
      description: `Limited-time offers, flash sales and daily discounts across every category on Storegrill${region ? ` in ${region.name}` : ''}.`,
      keywords: uniqueKeywords([
        'deals', 'flash sales', 'discounts', 'offers',
        ...(region ? [`deals ${short.toLowerCase()}`, `sales ${region.name.toLowerCase()}`] : []),
      ]),
    };
  },
  vendors: (regionKey?: string) => {
    const region = regionKey ? regionByKey(regionKey) : undefined;
    const short = region ? seoCountryToken(region.key) : '';
    return {
      title: `Verified Sellers & Vendors in ${short}`,
      description:
        'Discover verified Storegrill vendors, their storefronts, ratings and policies. Shop confidently from vetted sellers in your region.',
      keywords: uniqueKeywords([
        'verified sellers', 'vendor marketplace', 'online stores',
        ...(region ? [`sellers in ${region.name.toLowerCase()}`, `verified vendors ${short.toLowerCase()}`] : []),
      ]),
    };
  },
  regions: () => ({
    title: 'Choose Your Country or Region',
    description:
      'Shop Storegrill in your country with local currency, language, payment methods and delivery. Available across North America, Europe, the Middle East, Africa and Asia-Pacific.',
    keywords: uniqueKeywords(['Storegrill regions', 'choose your country', 'local currency shopping', 'Storegrill worldwide']),
  }),
  cart: () => ({
    title: 'Your Shopping Cart',
    description: 'Review the items in your Storegrill shopping cart.',
  }),
  account: () => ({
    title: 'My Account',
    description: 'Manage your orders, shipping addresses, payment methods and wishlist on Storegrill.',
  }),
  checkout: () => ({
    title: 'Checkout',
    description: 'Complete your Storegrill order. Enter shipping details, select payment method and review your order before purchase.',
  }),
  confirmation: () => ({
    title: 'Order Confirmed',
    description: 'Your Storegrill order has been received. Track your shipment and view order details.',
  }),
};

export function organizationJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: `https://${process.env.NEXT_PUBLIC_APEX_DOMAIN || 'Storegrill.net'}`,
    logo: `https://${process.env.NEXT_PUBLIC_APEX_DOMAIN || 'Storegrill.net'}/icons/icon-512.png`,
    sameAs: [
      'https://twitter.com/Storegrill',
      'https://www.facebook.com/Storegrill',
      'https://www.linkedin.com/company/storegrill',
      'https://www.instagram.com/storegrill',
    ],
  };
}

export function webSiteJsonLd(): object {
  const apex = process.env.NEXT_PUBLIC_APEX_DOMAIN || 'Storegrill.net';
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `https://${apex}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `https://${apex}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

interface ArticleJsonLdInput {
  title: string;
  description?: string;
  image?: string;
  authorName?: string;
  publishedAt?: string;
  url: string;
}

export function articleJsonLd(input: ArticleJsonLdInput): object {
  const apex = process.env.NEXT_PUBLIC_APEX_DOMAIN || 'Storegrill.net';
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    image: input.image ? [input.image] : [],
    author: {
      '@type': 'Person',
      name: input.authorName || 'Storegrill Team',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `https://${apex}/icons/icon-512.png`,
      },
    },
    datePublished: input.publishedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': input.url,
    },
  };
}

interface ProductJsonLdInput {
  id: string;
  name: string;
  description?: string;
  image?: string[];
  priceMinorUnits: number;
  currencyCode: string;
  rating?: number;
  reviewCount?: number;
  vendorName?: string;
  slug?: string;
  inStock?: boolean;
}

export function productJsonLd(input: ProductJsonLdInput, regionKey: string): object {
  const decimals = input.currencyCode === 'JPY' ? 1 : 100;
  const price = input.priceMinorUnits / decimals;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description?.slice(0, 300),
    image: input.image,
    sku: input.id,
    brand: { '@type': 'Brand', name: input.vendorName || SITE_NAME },
    ...((input.rating ?? 0) > 0 && input.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (input.rating ?? 0).toFixed(1),
            reviewCount: input.reviewCount,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: regionUrl(regionKey, `/products/${input.slug || input.id}`),
      priceCurrency: input.currencyCode,
      price: price.toFixed(input.currencyCode === 'JPY' ? 0 : 2),
      availability: `https://schema.org/${input.inStock === false ? 'OutOfStock' : 'InStock'}`,
      seller: { '@type': 'Organization', name: input.vendorName || SITE_NAME },
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>, regionKey: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: regionUrl(regionKey, item.path),
    })),
  };
}