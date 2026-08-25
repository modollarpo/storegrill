import type { Metadata } from 'next';
import { regionUrl, regionByKey, APEX_DOMAIN, REGION_META } from './regions';

const SITE_NAME = 'Storegrill';

export function absoluteUrl(path: string): string {
  return `https://${APEX_DOMAIN}${path.startsWith('/') ? path : `/${path}`}`;
}

interface PageSeoOptions {
  title: string;
  description: string;
  path: string;
  regionKey: string;
  noIndex?: boolean;
  ogImage?: string;
}

export function buildMetadata({
  title,
  description,
  path,
  regionKey,
  noIndex = false,
  ogImage,
}: PageSeoOptions): Metadata {
  const region = regionByKey(regionKey);
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
    title,
    description,
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
      title: `${title} | ${SITE_NAME} ${region.name}`,
      description,
      url,
      locale: region.languages[0]?.code ?? 'en',
      images: [{ url: ogImage || '/banners/bannerOne.jpg', width: 1600, height: 900, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Storegrill',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [ogImage || '/banners/bannerOne.jpg'],
    },
  };
}

export const SEO_DEFAULTS = {
  home: (regionName: string) => ({
    title: `Online Shopping for Electronics, Home, Fashion & More`,
    description: `Shop millions of products from verified vendors on Storegrill ${regionName}. Fast delivery, secure payments, easy returns. Free shipping on eligible orders.`,
  }),
  search: (query: string) => ({
    title: query ? `"${query}" — Search Results` : 'Search all products',
    description: `Browse search results${query ? ` for "${query}"` : ''} on Storegrill. Compare prices from multiple vendors, read reviews, and buy with confidence.`,
  }),
  product: (name: string, price?: string, currency?: string, rating?: number, reviewCount?: number) => ({
    title: name,
    description: price
      ? `Buy ${name} — ${currency ? currency + ' ' + price : ''}${rating !== undefined && reviewCount !== undefined ? ` — ${rating.toFixed(1)}★ from ${reviewCount} reviews` : ''}`
      : `Buy ${name} on Storegrill. Check price, availability, reviews and delivery options from verified sellers.`,
  }),
  deals: () => ({
    title: "Today's Deals",
    description: 'Limited-time offers, flash sales and daily discounts across every category on Storegrill.',
  }),
  vendors: () => ({
    title: 'Our Vendors & Sellers',
    description: 'Discover verified Storegrill vendors, their storefronts, ratings and policies.',
  }),
  regions: () => ({
    title: 'Choose Your Country or Region',
    description: 'Shop Storegrill in your country with local currency, language, payment methods and delivery. Available across North America, Europe, Asia-Pacific and the Middle East.',
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
    url: `https://${APEX_DOMAIN}`,
    logo: `https://${APEX_DOMAIN}/logo.png`,
    sameAs: [],
  };
}

export function webSiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `https://${APEX_DOMAIN}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `https://${APEX_DOMAIN}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
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