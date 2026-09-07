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
  // Row 1
  [
    {
      title: 'Go-to gifts for everyone',
      tiles: [
        { title: 'Gifts for him', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=80', href: '/products?q=gifts+for+him' },
        { title: 'Gifts for her', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80', href: '/products?q=gifts+for+her' },
        { title: 'Gifts for teens', image: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=300&auto=format&fit=crop&q=80', href: '/products?q=gifts+for+teens' },
        { title: 'Gifts for kids', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80', href: '/products?q=toys' },
      ],
    },
    {
      title: 'Second Chance Deal Days: deals are live',
      tiles: [
        { title: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80', href: '/products?category=smartphones' },
        { title: 'Home & Kitchen', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=300&auto=format&fit=crop&q=80', href: '/products?category=home-kitchen' },
        { title: 'Home Improvement', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80', href: '/products?category=home-improvement' },
        { title: 'PC & Accessories', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=80', href: '/products?category=pc-accessories' },
      ],
    },
    {
      title: 'Most-loved finds',
      tiles: [
        { title: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&auto=format&fit=crop&q=80', href: '/products?category=fashion' },
        { title: 'Tech', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&auto=format&fit=crop&q=80', href: '/products?category=tech' },
        { title: 'Kitchen', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&auto=format&fit=crop&q=80', href: '/products?category=kitchen' },
        { title: 'Home', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&auto=format&fit=crop&q=80', href: '/products?category=home' },
      ],
    },
    {
      title: 'Resale: more savings, less waste',
      tiles: [
        { title: 'PC & Laptops', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&auto=format&fit=crop&q=80', href: '/products?category=pc-laptops' },
        { title: 'Home & Kitchen', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', href: '/products?category=home-kitchen' },
        { title: 'Electronics', image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=300&auto=format&fit=crop&q=80', href: '/products?category=electronics' },
        { title: 'Home Improvement', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&auto=format&fit=crop&q=80', href: '/products?category=home-improvement' },
      ],
    },
  ],
  // Row 2
  [
    {
      title: 'Autumn favourites',
      tiles: [
        { title: 'Autumn fashion', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&auto=format&fit=crop&q=80', href: '/products?q=autumn+fashion' },
        { title: 'Beauty picks', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80', href: '/products?category=beauty' },
        { title: 'Rainy day staples', image: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80', href: '/products?q=umbrella' },
        { title: 'Cosy essentials', image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300&auto=format&fit=crop&q=80', href: '/products?q=candle' },
      ],
    },
    {
      title: 'Seriously good brands',
      tiles: [
        { title: 'Fashion', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&auto=format&fit=crop&q=80', href: '/products?category=fashion' },
        { title: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80', href: '/products?category=electronics' },
        { title: 'Kitchen', image: 'https://images.unsplash.com/photo-1589365252845-d85c37341999?w=300&auto=format&fit=crop&q=80', href: '/products?category=kitchen' },
        { title: 'Beauty', image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&auto=format&fit=crop&q=80', href: '/products?category=beauty' },
      ],
    },
    {
      title: 'Level up your game',
      tiles: [
        { title: 'PlayStation', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=300&auto=format&fit=crop&q=80', href: '/products?q=playstation' },
        { title: 'Xbox Series', image: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=300&auto=format&fit=crop&q=80', href: '/products?q=xbox' },
        { title: 'Nintendo', image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b12?w=300&auto=format&fit=crop&q=80', href: '/products?q=nintendo' },
        { title: 'Virtual Reality', image: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=300&auto=format&fit=crop&q=80', href: '/products?q=vr' },
      ],
    },
    {
      title: 'Gifts by interest',
      tiles: [
        { title: 'Fave show merch', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80', href: '/products?q=merch' },
        { title: 'Travel-ready finds', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&auto=format&fit=crop&q=80', href: '/products?q=travel' },
        { title: 'Gaming gear', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=300&auto=format&fit=crop&q=80', href: '/products?q=gaming' },
        { title: 'Fitness finds', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80', href: '/products?q=fitness' },
      ],
    },
  ],
  // Row 3
  [
    {
      title: 'Video games & accessories',
      tiles: [
        { title: 'Xbox controllers', image: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?w=300&auto=format&fit=crop&q=80', href: '/products?q=controller' },
        { title: 'Nintendo', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=300&auto=format&fit=crop&q=80', href: '/products?q=nintendo' },
        { title: 'VR headsets', image: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?w=300&auto=format&fit=crop&q=80', href: '/products?q=vr' },
        { title: 'PS5 accessories', image: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=300&auto=format&fit=crop&q=80', href: '/products?q=ps5' },
      ],
    },
    {
      title: 'Electronics store',
      tiles: [
        { title: 'DAB radios', image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=300&auto=format&fit=crop&q=80', href: '/products?q=radio' },
        { title: 'Headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80', href: '/products?category=headphones' },
        { title: 'USB cables', image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&auto=format&fit=crop&q=80', href: '/products?q=cable' },
        { title: 'Extension cords', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80', href: '/products?q=extension' },
      ],
    },
    {
      title: 'Games and toys',
      tiles: [
        { title: 'Boards', image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300&auto=format&fit=crop&q=80', href: '/products?q=board+game' },
        { title: 'Playing cards', image: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=300&auto=format&fit=crop&q=80', href: '/products?q=cards' },
        { title: 'Playhouses', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80', href: '/products?q=toys' },
        { title: 'Dolls', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80', href: '/products?q=dolls' },
      ],
    },
    {
      type: 'promo',
      title: "Smile. You're on camera.",
      subtitle: 'It sees what you miss',
      bgClass: 'bg-neutral-900 text-white',
      image: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400&auto=format&fit=crop&q=80',
      ctaText: 'Explore Dyson cameras',
      href: '/products?q=camera',
    },
  ],
  // Row 4
  [
    {
      title: 'Decor & home must-haves under £20',
      tiles: [
        { title: 'Home', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&auto=format&fit=crop&q=80', href: '/products?category=home' },
        { title: 'Decor', image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=300&auto=format&fit=crop&q=80', href: '/products?category=decor' },
        { title: 'Organisation', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', href: '/products?q=organizer' },
        { title: 'Kitchen', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&auto=format&fit=crop&q=80', href: '/products?category=kitchen' },
      ],
    },
    {
      title: "Hello Autumn: Season must-haves under £20",
      tiles: [
        { title: "Men's fashion", image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=300&auto=format&fit=crop&q=80', href: '/products?category=mens-fashion' },
        { title: "Women's fashion", image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&auto=format&fit=crop&q=80', href: '/products?category=womens-fashion' },
        { title: 'Decor', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80', href: '/products?category=decor' },
        { title: 'Essentials', image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&auto=format&fit=crop&q=80', href: '/products?q=essentials' },
      ],
    },
    {
      title: "Levi's original style. Always iconic.",
      tiles: [
        { title: 'Men', image: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=300&auto=format&fit=crop&q=80', href: '/products?brand=Levis' },
        { title: 'Women', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', href: '/products?brand=Levis' },
        { title: 'Exclusive tops', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=300&auto=format&fit=crop&q=80', href: '/products?brand=Levis' },
        { title: 'Trending now', image: 'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=300&auto=format&fit=crop&q=80', href: '/products?brand=Levis' },
      ],
    },
    {
      title: 'Media',
      tiles: [
        { title: 'DVD', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&auto=format&fit=crop&q=80', href: '/products?q=dvd' },
        { title: 'Blu-ray', image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=300&auto=format&fit=crop&q=80', href: '/products?q=blu-ray' },
        { title: 'TV series', image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=300&auto=format&fit=crop&q=80', href: '/products?q=tv+series' },
        { title: 'Box sets', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&auto=format&fit=crop&q=80', href: '/products?q=box+set' },
      ],
    },
  ],
  // Row 5
  [
    {
      title: 'Echo, Fire TV, and more',
      tiles: [
        { title: 'Echo Studio', image: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=300&auto=format&fit=crop&q=80', href: '/products?q=echo' },
        { title: 'Fire TV Cube', image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=300&auto=format&fit=crop&q=80', href: '/products?q=fire+tv' },
        { title: 'Kindle Scribe', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&auto=format&fit=crop&q=80', href: '/products?q=kindle' },
        { title: 'Ring Video Doorbell', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=300&auto=format&fit=crop&q=80', href: '/products?q=ring' },
      ],
    },
    {
      title: 'Workout essentials under £20',
      tiles: [
        { title: 'Fitness under £5', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&auto=format&fit=crop&q=80', href: '/products?q=fitness' },
        { title: 'Crazy low prices', image: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=300&auto=format&fit=crop&q=80', href: '/deals' },
        { title: 'Summer sports', image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&auto=format&fit=crop&q=80', href: '/products?q=sports' },
        { title: 'Activewear', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80', href: '/products?category=activewear' },
      ],
    },
    {
      title: 'Artist merch',
      tiles: [
        { title: 'Eagles', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
        { title: 'Ellie Goulding', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
        { title: 'James Blunt', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
        { title: 'Hilary Duff', image: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
      ],
    },
    {
      title: 'Podcasts on Amazon Music',
      tiles: [
        { title: 'Live, Laugh, Luke', image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&auto=format&fit=crop&q=80', href: '/products?q=podcast' },
        { title: 'Intrigue', image: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300&auto=format&fit=crop&q=80', href: '/products?q=podcast' },
        { title: 'Get A Grip', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80', href: '/products?q=podcast' },
        { title: 'British Scandal', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', href: '/products?q=podcast' },
      ],
    },
  ],
  // Row 6
  [
    {
      title: 'Playlists on Amazon Music',
      tiles: [
        { title: 'Rediscover Sam Smith', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
        { title: 'Rediscover Jorja Smith', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
        { title: 'Caribbean Music', image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
        { title: 'Feeling Happy', image: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=300&auto=format&fit=crop&q=80', href: '/products?q=music' },
      ],
    },
    {
      type: 'promo',
      title: 'Save up to 15% on your essentials',
      bgClass: 'bg-white text-neutral-900',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
      ctaText: 'Shop essentials',
      href: '/products?q=essentials',
    },
    {
      title: 'Back to Hogwarts',
      tiles: [
        { title: 'Toys', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&auto=format&fit=crop&q=80', href: '/products?category=toys' },
        { title: 'Clothing', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&auto=format&fit=crop&q=80', href: '/products?category=clothing' },
        { title: 'School Supplies', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&auto=format&fit=crop&q=80', href: '/products?q=school' },
        { title: 'Collectibles', image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80', href: '/products?q=collectibles' },
      ],
    },
    {
      title: 'Camera & photo',
      tiles: [
        { title: 'Film photography', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&auto=format&fit=crop&q=80', href: '/products?q=camera' },
        { title: 'Instant cameras', image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80', href: '/products?q=instant+camera' },
        { title: 'Camcorders', image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=300&auto=format&fit=crop&q=80', href: '/products?q=camcorder' },
        { title: 'SLR lenses', image: 'https://images.unsplash.com/photo-1617005082133-5c8b4b5683c5?w=300&auto=format&fit=crop&q=80', href: '/products?q=lens' },
      ],
    },
  ],
];

const HERO_SLIDES = [
  {
    title: 'Level up your tech',
    subtitle: 'Essentials for the tech-savvy',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    href: '/products?category=tech',
  },
  {
    title: 'Shop deals ending soon',
    subtitle: 'Save big on top electronics and home goods',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80',
    href: '/deals',
  },
  {
    title: 'Second Chance Deal Days',
    subtitle: '1-10 Sept. Certified refurbished & open-box deals',
    image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1200&auto=format&fit=crop&q=80',
    href: '/deals',
  },
  {
    title: 'Sees. Thinks. Jets.',
    subtitle: 'Not your average toothbrush — Dyson tech',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&auto=format&fit=crop&q=80',
    href: '/products?q=dyson',
  },
  {
    title: 'Your space, your style',
    subtitle: 'Furniture and décor for uni life',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&auto=format&fit=crop&q=80',
    href: '/products?category=home',
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
                      <h3 className="text-lg md:text-xl font-bold text-text-primary tracking-tight mb-1">{item.title}</h3>
                      {item.subtitle && <p className="text-xs text-text-tertiary mb-3">{item.subtitle}</p>}
                    </div>
                    {item.image && (
                      <div className="relative w-full h-48 my-3 rounded-lg overflow-hidden bg-smoke-100">
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      </div>
                    )}
                    <Link
                      href={item.href}
                      className="inline-block mt-2 text-xs font-bold text-ember hover:text-ember-dark hover:underline"
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
