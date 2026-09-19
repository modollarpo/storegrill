export interface HeroCategorySlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  image: string;
  badge?: string;
  theme: {
    bg: string;
    text: string;
    accent: string;
    badgeBg?: string;
    badgeText?: string;
  };
}

export const HERO_CATEGORY_SLIDES: HeroCategorySlide[] = [
  {
    id: 'electronics',
    eyebrow: 'ELECTRONICS',
    title: 'Upgrade Your Everyday Tech',
    description: 'Smart devices, accessories and essentials.',
    cta: 'Shop Electronics',
    href: '/categories/electronics',
    image: '/banners/category/top-cat-hp-televisions.png',
    badge: 'Trending',
    theme: {
      bg: 'var(--hc-navy)',
      text: '#FFFFFF',
      accent: 'var(--hc-teal)',
      badgeBg: 'var(--hc-teal)',
      badgeText: '#FFFFFF',
    },
  },
  {
    id: 'home-living',
    eyebrow: 'HOME & LIVING',
    title: 'Make Your Space Better',
    description: 'Furniture, kitchen, decor and everyday essentials.',
    cta: 'Explore Home',
    href: '/categories/furniture',
    image: '/banners/category/furniture.png',
    theme: {
      bg: 'var(--hc-cream)',
      text: 'var(--hc-charcoal)',
      accent: 'var(--hc-gold)',
    },
  },
  {
    id: 'fashion',
    eyebrow: 'FASHION',
    title: 'Fresh Looks. Better Finds.',
    description: 'Discover fashion, footwear and accessories.',
    cta: 'Shop Fashion',
    href: '/categories/health-beauty',
    image: '/banners/category/health-beauty.png',
    badge: 'New',
    theme: {
      bg: 'var(--hc-blush)',
      text: 'var(--hc-charcoal)',
      accent: '#E8B44C',
      badgeBg: 'var(--hc-charcoal)',
      badgeText: '#FFFFFF',
    },
  },
  {
    id: 'beauty',
    eyebrow: 'BEAUTY & CARE',
    title: 'Your Everyday Essentials',
    description: 'Beauty, grooming and personal care.',
    cta: 'Explore Beauty',
    href: '/categories/health-beauty',
    image: '/banners/category/top-cat-hp-health-beauty.png',
    theme: {
      bg: 'var(--hc-lavender)',
      text: 'var(--hc-charcoal)',
      accent: 'var(--hc-teal)',
    },
  },
  {
    id: 'deals',
    eyebrow: 'DEALS',
    title: 'Deals Worth Discovering',
    description: 'Limited-time offers from across Storegrill.',
    cta: 'View Deals',
    href: '/deals',
    image: '/banners/category/top-cat-hp-console-gaming.png',
    badge: 'Up to 40% off',
    theme: {
      bg: 'var(--hc-navy)',
      text: '#FFFFFF',
      accent: 'var(--hc-gold)',
      badgeBg: 'var(--hc-gold)',
      badgeText: 'var(--hc-navy)',
    },
  },
  {
    id: 'outdoor',
    eyebrow: 'OUTDOOR',
    title: 'Adventure Starts Here',
    description: 'Grills, patio furniture and garden gear.',
    cta: 'Shop Outdoor',
    href: '/categories/outdoor',
    image: '/banners/category/outdoor.png',
    theme: {
      bg: 'var(--hc-mint)',
      text: 'var(--hc-charcoal)',
      accent: 'var(--hc-teal)',
    },
  },
  {
    id: 'appliances',
    eyebrow: 'APPLIANCES',
    title: 'The Essentials That Work',
    description: 'Upgrade your home with appliances that deliver.',
    cta: 'Shop Appliances',
    href: '/categories/appliances',
    image: '/banners/category/top-cat-hp-washing-machine.png',
    badge: 'Popular',
    theme: {
      bg: 'var(--hc-sky)',
      text: 'var(--hc-charcoal)',
      accent: 'var(--hc-navy)',
      badgeBg: 'var(--hc-navy)',
      badgeText: '#FFFFFF',
    },
  },
  {
    id: 'kitchen',
    eyebrow: 'KITCHEN',
    title: 'Cook. Store. Serve.',
    description: 'Cookware, organisers and storage for a kitchen that works.',
    cta: 'Explore Kitchen',
    href: '/categories/kitchen',
    image: '/banners/category/kitchen.png',
    theme: {
      bg: 'var(--hc-off-white)',
      text: 'var(--hc-charcoal)',
      accent: 'var(--hc-gold)',
    },
  },
];
