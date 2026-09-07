'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { RecentlyViewed } from '@/components/commerce/RecentlyViewed';

interface CardTile {
  title: string;
  image: string;
  href: string;
}

interface GridCardSection {
  type?: 'grid';
  title: string;
  tiles: CardTile[];
  linkText?: string;
  linkHref?: string;
}

interface PromoCardSection {
  type: 'promo';
  title: string;
  subtitle?: string;
  image?: string;
  bgClass?: string;
  textColor?: string;
  ctaText?: string;
  href: string;
}

type SectionItem = GridCardSection | PromoCardSection;

const HOME_SECTIONS: SectionItem[][] = [
  // Row 1: Core Marketplace Pillars
  [
    {
      title: 'Trending across global regions',
      tiles: [
        { title: 'Smartphones & Mobile', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80', href: '/products?category=smartphones' },
        { title: 'Home & Kitchen', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&auto=format&fit=crop&q=80', href: '/products?category=home-kitchen' },
        { title: 'PC & Accessories', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80', href: '/products?category=pc-accessories' },
        { title: 'Wearable Tech', image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&auto=format&fit=crop&q=80', href: '/products?category=wearables' },
      ],
    },
    {
      title: 'Storegrill Deal Days & Flash Sales',
      tiles: [
        { title: 'Daily Flash Deals', image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=300&auto=format&fit=crop&q=80', href: '/deals' },
        { title: 'Certified Refurbished', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80', href: '/products?q=refurbished' },
        { title: 'Clearance Bargains', image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=300&auto=format&fit=crop&q=80', href: '/deals' },
        { title: 'Bundle Savings', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', href: '/products?q=bundle' },
      ],
    },
    {
      title: 'Verified Vendor Spotlights',
      tiles: [
        { title: 'Top-Rated Merchants', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&auto=format&fit=crop&q=80', href: '/vendors' },
        { title: 'Handmade Artisans', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80', href: '/vendors' },
        { title: 'Certified Direct Brands', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80', href: '/vendors' },
        { title: 'Eco-Resale Partners', image: 'https://images.unsplash.com/photo-1532336414038-cf19250c5756?w=300&auto=format&fit=crop&q=80', href: '/vendors' },
      ],
    },
    {
      title: 'Smart Living & Improvement',
      tiles: [
        { title: 'Kitchen Appliances', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&auto=format&fit=crop&q=80', href: '/products?category=kitchen' },
        { title: 'Smart Lighting', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=300&auto=format&fit=crop&q=80', href: '/products?q=lighting' },
        { title: 'Home Security', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=300&auto=format&fit=crop&q=80', href: '/products?q=security' },
        { title: 'DIY & Tools', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80', href: '/products?category=home-improvement' },
      ],
    },
  ],
  // Row 2: Seasonal Fashion, Gaming & Promo
  [
    {
      title: 'Autumn Fashion & Seasonal Style',
      tiles: [
        { title: "Men's Fall Wear", image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=300&auto=format&fit=crop&q=80', href: '/products?category=mens-fashion' },
        { title: "Women's Knitwear", image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&auto=format&fit=crop&q=80', href: '/products?category=womens-fashion' },
        { title: 'Footwear & Boots', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80', href: '/products?category=footwear' },
        { title: 'Bags & Accessories', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&auto=format&fit=crop&q=80', href: '/products?category=accessories' },
      ],
    },
    {
      title: 'Gaming & Next-Gen Entertainment',
      tiles: [
        { title: 'PlayStation 5 Hub', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300&auto=format&fit=crop&q=80', href: '/products?q=playstation' },
        { title: 'Xbox Series X/S', image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=300&auto=format&fit=crop&q=80', href: '/products?q=xbox' },
        { title: 'Nintendo Switch', image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b12?w=300&auto=format&fit=crop&q=80', href: '/products?q=nintendo' },
        { title: 'VR & Sim Gaming', image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=300&auto=format&fit=crop&q=80', href: '/products?q=vr' },
      ],
    },
    {
      title: 'Health, Beauty & Wellness',
      tiles: [
        { title: 'Skincare Essentials', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80', href: '/products?category=beauty' },
        { title: 'Haircare & Styling', image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=300&auto=format&fit=crop&q=80', href: '/products?q=haircare' },
        { title: 'Fitness & Gym', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80', href: '/products?q=fitness' },
        { title: 'Wellness & Nutrition', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80', href: '/products?q=wellness' },
      ],
    },
    {
      type: 'promo',
      title: 'Sell on Storegrill Marketplace',
      subtitle: 'Reach millions of global shoppers with multi-currency checkout & zero listing fees.',
      bgClass: 'bg-gradient-to-br from-ember to-deep text-white',
      image: 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=400&auto=format&fit=crop&q=80',
      ctaText: 'Start selling today',
      href: '/vendor/apply',
    },
  ],
  // Row 3: Office, Outdoor & Global Shipping
  [
    {
      title: 'Home Office & Productivity',
      tiles: [
        { title: 'Ergonomic Chairs', image: 'https://images.unsplash.com/photo-1580481077494-e3299ac25e94?w=300&auto=format&fit=crop&q=80', href: '/products?q=chair' },
        { title: 'Laptops & Monitors', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80', href: '/products?category=laptops' },
        { title: 'Desk Organization', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', href: '/products?q=desk' },
        { title: 'Stationery & Tech', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&auto=format&fit=crop&q=80', href: '/products?q=stationery' },
      ],
    },
    {
      title: 'Outdoor & Garden Recreation',
      tiles: [
        { title: 'Camping & Hiking', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=300&auto=format&fit=crop&q=80', href: '/products?q=camping' },
        { title: 'BBQ & Grills', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&auto=format&fit=crop&q=80', href: '/products?q=bbq' },
        { title: 'Patio & Furniture', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&auto=format&fit=crop&q=80', href: '/products?category=outdoor' },
        { title: 'Sports & Athletics', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&auto=format&fit=crop&q=80', href: '/products?q=sports' },
      ],
    },
    {
      title: 'Studio Sound & Audio',
      tiles: [
        { title: 'Wireless Earbuds', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80', href: '/products?category=headphones' },
        { title: 'Noise-Canceling', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80', href: '/products?category=headphones' },
        { title: 'Bluetooth Speakers', image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=300&auto=format&fit=crop&q=80', href: '/products?q=speaker' },
        { title: 'Turntables & Hi-Fi', image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=300&auto=format&fit=crop&q=80', href: '/products?q=turntable' },
      ],
    },
    {
      type: 'promo',
      title: 'Multi-Currency Global Checkout',
      subtitle: 'Shop effortlessly in GBP, USD, EUR, AUD, NGN & more with local payment methods.',
      bgClass: 'bg-surface-raised text-text-primary border border-border',
      image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&auto=format&fit=crop&q=80',
      ctaText: 'Explore global regions',
      href: '/regions',
    },
  ],
];

const HERO_SLIDES = [
  {
    title: 'Storegrill Second Chance Deal Days',
    subtitle: 'Up to 50% off certified refurbished & open-box tech, home goods and appliances.',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80',
    href: '/deals',
  },
  {
    title: 'Global Direct Marketplace',
    subtitle: 'Direct from verified international vendors with local currency & express regional freight.',
    image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1200&auto=format&fit=crop&q=80',
    href: '/regions',
  },
  {
    title: 'Verified Vendor Partnership Program',
    subtitle: 'Zero-commission onboarding & instant multi-currency payouts for global brands.',
    image: 'https://images.unsplash.com/photo-1556742049-0a67d553c2a5?w=1200&auto=format&fit=crop&q=80',
    href: '/vendor/apply',
  },
  {
    title: 'Autumn Home & Living Refresh',
    subtitle: 'Upgrade your sanctuary with trending furniture & decor under £20.',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&auto=format&fit=crop&q=80',
    href: '/products?category=home',
  },
  {
    title: 'Next-Gen Smart Electronics',
    subtitle: 'Premium wireless audio, smart home devices, and wearable tech.',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    href: '/products?category=electronics',
  },
];

export function AmazonHomeGrid() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="bg-surface-page min-h-screen text-text-primary relative overflow-hidden pb-16">
      {/* Decorative Storegrill background glow blobs (inspired by /regions page) */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-ember-pale/50 to-transparent -z-10" />
      <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-ember/5 blur-[120px] -z-10" />
      <div className="absolute top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-tealink/5 blur-[120px] -z-10" />

      {/* Hero Banner Carousel */}
      <div className="relative w-full overflow-hidden">
        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] max-h-[420px] bg-charcoal">
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            priority
            className="object-cover opacity-90 transition-opacity duration-500"
            sizes="100vw"
          />
          {/* Gradient fade at bottom to blend into the card grid */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface-page via-transparent to-black/30 pointer-events-none" />

          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={() => setCurrentSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/3 -translate-y-1/2 w-12 h-24 bg-transparent hover:bg-white/10 hover:border hover:border-white/40 flex items-center justify-center text-white text-3xl font-bold rounded-sm transition-all focus:outline-none"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setCurrentSlide((currentSlide + 1) % HERO_SLIDES.length)}
            aria-label="Next slide"
            className="absolute right-4 top-1/3 -translate-y-1/2 w-12 h-24 bg-transparent hover:bg-white/10 hover:border hover:border-white/40 flex items-center justify-center text-white text-3xl font-bold rounded-sm transition-all focus:outline-none"
          >
            ›
          </button>

          {/* Slide info overlay bottom left */}
          <div className="absolute bottom-6 left-6 md:left-12 z-10 bg-surface-raised/95 border border-border backdrop-blur-sm px-6 py-4 rounded-xl shadow-card">
            <h2 className="text-lg md:text-xl font-bold text-text-primary">{slide.title}</h2>
            <p className="text-xs md:text-sm text-text-tertiary">{slide.subtitle}</p>
            <Link href={slide.href} className="inline-block mt-2 text-xs font-bold text-ember hover:text-ember-dark hover:underline">
              Shop now →
            </Link>
          </div>
        </div>
      </div>

      {/* Overlapping / Stacked 4-Column Card Grid */}
      <div className="max-w-[1500px] mx-auto px-4 -mt-24 sm:-mt-36 md:-mt-48 relative z-20 pb-12">
        {HOME_SECTIONS.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {row.map((item, itemIndex) => {
              if (item.type === 'promo') {
                return (
                  <div
                    key={itemIndex}
                    className={cn(
                      'bg-surface-raised rounded-xl shadow-card p-5 flex flex-col justify-between border border-border transition-all hover:shadow-card-hover',
                      item.bgClass
                    )}
                  >
                    <div>
                      <h3 className="text-lg md:text-xl font-bold tracking-tight mb-1">{item.title}</h3>
                      {item.subtitle && <p className="text-xs opacity-90 mb-3">{item.subtitle}</p>}
                    </div>
                    {item.image && (
                      <div className="relative w-full h-48 my-3 rounded-lg overflow-hidden bg-smoke-100">
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      </div>
                    )}
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-block mt-2 text-xs font-bold hover:underline",
                        item.bgClass?.includes('bg-') ? "text-white underline" : "text-ember hover:text-ember-dark"
                      )}
                    >
                      {item.ctaText || 'Shop now'} &gt;
                    </Link>
                  </div>
                );
              }

              const section = item as GridCardSection;
              return (
                <div
                  key={itemIndex}
                  className="bg-surface-raised rounded-xl shadow-card p-5 flex flex-col justify-between border border-border transition-all hover:shadow-card-hover"
                >
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight mb-3">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {section.tiles.map((tile, tileIdx) => (
                        <Link key={tileIdx} href={tile.href} className="group block">
                          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-smoke-100 mb-1.5 border border-smoke-200">
                            <Image
                              src={tile.image}
                              alt={tile.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                              sizes="(max-width: 640px) 50vw, 25vw"
                            />
                          </div>
                          <span className="block text-xs text-text-primary font-medium group-hover:text-ember group-hover:underline line-clamp-1">
                            {tile.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <Link
                    href="/products"
                    className="text-xs font-bold text-ember hover:text-ember-dark hover:underline mt-2 inline-block"
                  >
                    See more &gt;
                  </Link>
                </div>
              );
            })}
          </div>
        ))}

        {/* Recently viewed by user */}
        <div className="mt-8 bg-surface-raised rounded-xl p-6 border border-border shadow-card">
          <RecentlyViewed />
        </div>
      </div>
    </div>
  );
}
