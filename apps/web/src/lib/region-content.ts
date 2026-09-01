import { DEFAULT_REGIONS, type RegionConfig } from '@Storegrill/shared';
import { DEFAULT_REGION_KEY } from './regions';

export function regionConfig(key: string): RegionConfig {
  return DEFAULT_REGIONS.find(r => r.key === key) ?? DEFAULT_REGIONS[0];
}

export function defaultConfig(): RegionConfig {
  return regionConfig(DEFAULT_REGION_KEY);
}

interface LawInfo {
  act: string;
  authority: string;
  authorityUrl: string;
  courts: string;
  jurisdictionNote: string;
}

const LAW_MAP: Record<string, LawInfo> = {
  US: { act: 'California Consumer Privacy Act (CCPA/CPRA) and applicable state privacy laws', authority: 'Federal Trade Commission', authorityUrl: 'https://www.ftc.gov', courts: 'state and federal courts of the State of Delaware', jurisdictionNote: 'US consumers' },
  CA: { act: 'Personal Information Protection and Electronic Documents Act (PIPEDA)', authority: 'Office of the Privacy Commissioner of Canada', authorityUrl: 'https://www.priv.gc.ca', courts: 'courts of the Province of Ontario', jurisdictionNote: 'Canadian consumers' },
  UK: { act: 'UK GDPR and the Data Protection Act 2018', authority: 'Information Commissioner\'s Office (ICO)', authorityUrl: 'https://ico.org.uk', courts: 'courts of England and Wales', jurisdictionNote: 'UK consumers' },
  IE: { act: 'GDPR and the Data Protection Acts 1988–2018', authority: 'Data Protection Commission', authorityUrl: 'https://www.dataprotection.ie', courts: 'courts of Ireland', jurisdictionNote: 'Irish consumers' },
  DE: { act: 'GDPR and the Bundesdatenschutzgesetz (BDSG)', authority: 'Die Datenschutzbeauftragten', authorityUrl: 'https://www.datenschutzkonferenzonline.de', courts: 'German courts', jurisdictionNote: 'consumers in Germany, Austria and Switzerland' },
  FR: { act: 'GDPR and the Loi Informatique et Libertés', authority: 'CNIL', authorityUrl: 'https://www.cnil.fr', courts: 'French courts', jurisdictionNote: 'French consumers' },
  CH: { act: 'Revised Federal Act on Data Protection (revFADP)', authority: 'Federal Data Protection and Information Commissioner (FDPIC)', authorityUrl: 'https://www.edoeb.admin.ch', courts: 'Swiss courts', jurisdictionNote: 'Swiss consumers' },
  AU: { act: 'Privacy Act 1988 and the Australian Privacy Principles', authority: 'Office of the Australian Information Commissioner (OAIC)', authorityUrl: 'https://www.oaic.gov.au', courts: 'courts of New South Wales', jurisdictionNote: 'Australian consumers' },
  JP: { act: 'Act on the Protection of Personal Information (APPI)', authority: 'Personal Information Protection Commission (PPC)', authorityUrl: 'https://www.ppc.go.jp', courts: 'Tokyo District Court', jurisdictionNote: 'Japanese consumers' },
  IN: { act: 'Digital Personal Data Protection Act, 2023 (DPDP)', authority: 'Data Protection Board of India', authorityUrl: 'https://www.meity.gov.in', courts: 'courts of India', jurisdictionNote: 'Indian consumers' },
  AE: { act: 'Federal Decree-Law No. 45 of 2021 (PDPL)', authority: 'UAE Data Office', authorityUrl: 'https://u.ae', courts: 'courts of the Emirate of Dubai', jurisdictionNote: 'UAE consumers' },
  NG: { act: 'Nigeria Data Protection Act, 2023 (NDPA) and the NDPC General Application and Implementation Directive', authority: 'Nigeria Data Protection Commission (NDPC)', authorityUrl: 'https://ndpc.gov.ng', courts: 'High Courts of the Federal Republic of Nigeria', jurisdictionNote: 'Nigerian consumers' },
  GH: { act: 'Data Protection Act, 2012 (Act 843)', authority: 'Data Protection Commission of Ghana', authorityUrl: 'https://www.dataprotection.org.gh', courts: 'courts of Ghana', jurisdictionNote: 'Ghanaian consumers' },
  KE: { act: 'Data Protection Act, 2019', authority: 'Office of the Data Protection Commissioner (ODPC)', authorityUrl: 'https://www.odpc.go.ke', courts: 'courts of Kenya', jurisdictionNote: 'Kenyan consumers' },
  UG: { act: 'Data Protection and Privacy Act, 2019', authority: 'Personal Data Protection Office (PDPO)', authorityUrl: 'https://ppdpo.go.ug', courts: 'courts of Uganda', jurisdictionNote: 'Ugandan consumers' },
  ZA: { act: 'Protection of Personal Information Act, 2013 (POPIA)', authority: 'Information Regulator of South Africa', authorityUrl: 'https://inforegulator.org.za', courts: 'courts of the Republic of South Africa', jurisdictionNote: 'South African consumers' },
  EG: { act: 'Data Protection Law No. 152 of 2020', authority: 'Egyptian Data Protection Centre', authorityUrl: 'https://www.mcit.gov.eg', courts: 'courts of the Arab Republic of Egypt', jurisdictionNote: 'Egyptian consumers' },
  MA: { act: 'Law No. 09-08 on the protection of individuals with regard to personal data processing', authority: 'CNDP Maroc', authorityUrl: 'https://www.cndp.ma', courts: 'courts of the Kingdom of Morocco', jurisdictionNote: 'Moroccan consumers' },
  TZ: { act: 'Personal Data Protection Act, 2022', authority: 'Personal Data Protection Commission of Tanzania', authorityUrl: 'https://www.pdpc.go.tz', courts: 'courts of the United Republic of Tanzania', jurisdictionNote: 'Tanzanian consumers' },
};

const FALLBACK_LAW: LawInfo = {
  act: 'applicable local data protection legislation',
  authority: 'the competent national data protection authority',
  authorityUrl: '/contact',
  courts: 'the courts of your country of residence',
  jurisdictionNote: 'consumers in your region',
};

export function lawFor(regionKey: string): LawInfo {
  return LAW_MAP[regionKey] ?? FALLBACK_LAW;
}

export function supportEmailFor(_regionKey: string): string {
  return 'support@storegrill.net';
}

export interface RegionPromoContent {
  currency: string;
  freeShippingThresholdMinorUnits: number;
  couponCode: string;
  couponDiscountPercent: number;
  cashbackPercent: number;
  heroHeadline: string;
  heroSubtitle: string;
  heroCta: string;
  heroImage?: string;
  heroExpiresAt?: string;
}

export interface HeroSlide {
  headline: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  bgClass: string;
  eyebrow?: string;
}

const PURPLE_GRADIENTS: string[] = [
  'bg-gradient-to-r from-[#4c12a1] to-[#7a4bc9]',
  'bg-gradient-to-r from-[#320b6e] to-[#6C597C]',
  'bg-gradient-to-r from-[#4c12a1] to-[#323E4D]',
  'bg-gradient-to-r from-[#6C597C] to-[#4c12a1]',
];

export interface CategoryBannerContent {
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  bannerImage: string;
  bannerBg: string;
}

export interface VendorSpotlightContent {
  storeName: string;
  slug: string;
  rating: number;
  reviewCount: number;
  logo?: string;
  description?: string;
}

const REGIONAL_CONTENT: Record<string, { hero: HeroSlide[]; promo: RegionPromoContent; categoryBanner: CategoryBannerContent; vendorSpotlight: VendorSpotlightContent[] }> = {
  UK: {
    hero: [
      {
        headline: "Unbeatable Deals in the UK",
        subtitle: "Free shipping on orders over £500. Get an extra 20% off with code SAVE20-UK.",
        ctaLabel: "Shop UK Deals",
        ctaHref: "/deals",
        bgClass: PURPLE_GRADIENTS[0],
        eyebrow: "Featured",
      },
      {
        headline: "Fresh Arrivals for UK Shoppers",
        subtitle: "Explore our latest curation for the UK market.",
        ctaLabel: "Discover Now",
        ctaHref: "/products?sort=newest",
        bgClass: PURPLE_GRADIENTS[1],
        eyebrow: "Just In",
      },
    ],
    promo: {
      currency: 'GBP',
      freeShippingThresholdMinorUnits: 50000,
      couponCode: 'SAVE20-UK',
      couponDiscountPercent: 20,
      cashbackPercent: 5,
      heroHeadline: "Shop the best UK deals",
      heroSubtitle: "Free shipping over £500 · 20% off with code SAVE20-UK",
      heroCta: "Shop UK",
    },
    categoryBanner: {
      title: "UK Tech Essentials",
      subtitle: "Top rated technology",
      description: "Upgrade your workspace with curated picks available now in the UK.",
      ctaLabel: "Shop Tech",
      ctaHref: "/products?category=electronics",
      bannerImage: "/banners/category/uk-tech.jpg",
      bannerBg: "#4c12a1",
    },
    vendorSpotlight: [
      { storeName: "Storegrill UK", slug: "storegrill-uk", rating: 4.9, reviewCount: 1250 },
      { storeName: "Tech Hub UK", slug: "tech-hub-uk", rating: 4.7, reviewCount: 890 },
    ],
  },
  US: {
    hero: [
      {
        headline: "Exclusive US Offers",
        subtitle: "Free shipping on orders over $650. Get 20% off with code SAVE20-US.",
        ctaLabel: "Shop US Deals",
        ctaHref: "/deals",
        bgClass: PURPLE_GRADIENTS[0],
        eyebrow: "Featured",
      },
      {
        headline: "Top US Trends",
        subtitle: "The latest curated for our US customers.",
        ctaLabel: "Shop Trends",
        ctaHref: "/products?sort=newest",
        bgClass: PURPLE_GRADIENTS[1],
        eyebrow: "Just In",
      },
    ],
    promo: {
      currency: 'USD',
      freeShippingThresholdMinorUnits: 65000,
      couponCode: 'SAVE20-US',
      couponDiscountPercent: 20,
      cashbackPercent: 5,
      heroHeadline: "Shop the best US deals",
      heroSubtitle: "Free shipping over $650 · 20% off with code SAVE20-US",
      heroCta: "Shop US",
    },
    categoryBanner: {
      title: "US Tech Essentials",
      subtitle: "Top rated technology",
      description: "Upgrade your workspace with curated picks available now in the US.",
      ctaLabel: "Shop Tech",
      ctaHref: "/products?category=electronics",
      bannerImage: "/banners/category/us-tech.jpg",
      bannerBg: "#4c12a1",
    },
    vendorSpotlight: [
      { storeName: "Storegrill US", slug: "storegrill-us", rating: 4.8, reviewCount: 3200 },
      { storeName: "Tech Hub US", slug: "tech-hub-us", rating: 4.6, reviewCount: 1500 },
    ],
  },
  EU: {
    hero: [
      {
        headline: "Top Deals Across Europe",
        subtitle: "Free shipping on orders over €600. Get 20% off with code SAVE20-EU.",
        ctaLabel: "Shop EU Deals",
        ctaHref: "/deals",
        bgClass: PURPLE_GRADIENTS[0],
        eyebrow: "Featured",
      },
      {
        headline: "Curated Styles for Europe",
        subtitle: "Discover the latest trends across the EU.",
        ctaLabel: "Shop Trends",
        ctaHref: "/products?sort=newest",
        bgClass: PURPLE_GRADIENTS[1],
        eyebrow: "Just In",
      },
    ],
    promo: {
      currency: 'EUR',
      freeShippingThresholdMinorUnits: 60000,
      couponCode: 'SAVE20-EU',
      couponDiscountPercent: 20,
      cashbackPercent: 5,
      heroHeadline: "Shop the best EU deals",
      heroSubtitle: "Free shipping over €600 · 20% off with code SAVE20-EU",
      heroCta: "Shop EU",
    },
    categoryBanner: {
      title: "EU Tech Essentials",
      subtitle: "Top rated technology",
      description: "Upgrade your workspace with curated picks available now in the EU.",
      ctaLabel: "Shop Tech",
      ctaHref: "/products?category=electronics",
      bannerImage: "/banners/category/eu-tech.jpg",
      bannerBg: "#4c12a1",
    },
    vendorSpotlight: [
      { storeName: "Storegrill EU", slug: "storegrill-eu", rating: 4.7, reviewCount: 950 },
      { storeName: "Tech Hub EU", slug: "tech-hub-eu", rating: 4.5, reviewCount: 600 },
    ],
  },
  AE: {
    hero: [
      {
        headline: "Unbeatable Deals in the UAE",
        subtitle: "Free shipping on orders over AED 2,400. Get 20% off with code SAVE20-AE.",
        ctaLabel: "Shop UAE Deals",
        ctaHref: "/deals",
        bgClass: PURPLE_GRADIENTS[0],
        eyebrow: "Featured",
      },
      {
        headline: "Premium Styles for UAE Shoppers",
        subtitle: "Curated selections for the UAE market.",
        ctaLabel: "Explore Now",
        ctaHref: "/products?sort=newest",
        bgClass: PURPLE_GRADIENTS[1],
        eyebrow: "Just In",
      },
    ],
    promo: {
      currency: 'AED',
      freeShippingThresholdMinorUnits: 240000,
      couponCode: 'SAVE20-AE',
      couponDiscountPercent: 20,
      cashbackPercent: 5,
      heroHeadline: "Shop the best UAE deals",
      heroSubtitle: "Free shipping over AED 2,400 · 20% off with code SAVE20-AE",
      heroCta: "Shop UAE",
    },
    categoryBanner: {
      title: "UAE Tech Essentials",
      subtitle: "Top rated technology",
      description: "Upgrade your workspace with curated picks available now in the UAE.",
      ctaLabel: "Shop Tech",
      ctaHref: "/products?category=electronics",
      bannerImage: "/banners/category/ae-tech.jpg",
      bannerBg: "#4c12a1",
    },
    vendorSpotlight: [
      { storeName: "Storegrill UAE", slug: "storegrill-ae", rating: 4.8, reviewCount: 800 },
      { storeName: "Tech Hub UAE", slug: "tech-hub-ae", rating: 4.6, reviewCount: 450 },
    ],
  },
  NG: {
    hero: [
      {
        headline: "Mega Deals for Nigeria",
        subtitle: "Free shipping on orders over ₦1,000,000. Get 20% off with code SAVE20-NG.",
        ctaLabel: "Shop NG Deals",
        ctaHref: "/deals",
        bgClass: PURPLE_GRADIENTS[0],
        eyebrow: "Featured",
      },
      {
        headline: "Fresh Trends for Nigeria",
        subtitle: "Explore our latest curation for Nigerian shoppers.",
        ctaLabel: "Shop Trends",
        ctaHref: "/products?sort=newest",
        bgClass: PURPLE_GRADIENTS[1],
        eyebrow: "Just In",
      },
    ],
    promo: {
      currency: 'NGN',
      freeShippingThresholdMinorUnits: 100000000,
      couponCode: 'SAVE20-NG',
      couponDiscountPercent: 20,
      cashbackPercent: 5,
      heroHeadline: "Shop the best Nigeria deals",
      heroSubtitle: "Free shipping over ₦1,000,000 · 20% off with code SAVE20-NG",
      heroCta: "Shop NG",
    },
    categoryBanner: {
      title: "Nigeria Tech Essentials",
      subtitle: "Top rated technology",
      description: "Upgrade your workspace with curated picks available now in Nigeria.",
      ctaLabel: "Shop Tech",
      ctaHref: "/products?category=electronics",
      bannerImage: "/banners/category/ng-tech.jpg",
      bannerBg: "#4c12a1",
    },
    vendorSpotlight: [
      { storeName: "Storegrill NG", slug: "storegrill-ng", rating: 4.7, reviewCount: 1100 },
      { storeName: "Tech Hub NG", slug: "tech-hub-ng", rating: 4.5, reviewCount: 750 },
    ],
  },
};

export function heroSlidesFor(regionKey: string): HeroSlide[] {
  return REGIONAL_CONTENT[regionKey]?.hero ?? REGIONAL_CONTENT.US.hero;
}

export function regionPromoContent(regionKey: string): RegionPromoContent {
  return REGIONAL_CONTENT[regionKey]?.promo ?? REGIONAL_CONTENT.US.promo;
}

export function categoryBannerFor(regionKey: string): CategoryBannerContent {
  return REGIONAL_CONTENT[regionKey]?.categoryBanner ?? REGIONAL_CONTENT.US.categoryBanner;
}

export function vendorSpotlightFor(regionKey: string): VendorSpotlightContent[] {
  return REGIONAL_CONTENT[regionKey]?.vendorSpotlight ?? REGIONAL_CONTENT.US.vendorSpotlight;
}

