export interface GuideEntry {
  slug: string;
  title: string;
  description: string;
  path: string;
}

const customer = [
  {
    slug: 'ordering-basics',
    title: 'How to place an order',
    description: 'Browse, add to cart, pick your delivery and payment method, and confirm your order in a few taps.',
  },
  {
    slug: 'tracking-orders',
    title: 'Track your order',
    description: 'Follow a parcel from dispatch to doorstep using your order number — no sign-in required.',
  },
  {
    slug: 'returns-refunds',
    title: 'Returns & refunds',
    description: 'Start a return within 30 days, arrange free collection for faults, and understand refund timelines.',
  },
  {
    slug: 'payments-currency',
    title: 'Payments & currency',
    description: 'Every payment method available in your region, how currency conversion works, and how we keep card data safe.',
  },
  {
    slug: 'deals-coupons',
    title: 'Deals & coupons',
    description: 'Find flash sales, apply coupon codes at checkout, and understand deal limits and stock caps.',
  },
  {
    slug: 'account-security',
    title: 'Account & security',
    description: 'Create an account, reset a password, turn on two-factor authentication, and spot phishing attempts.',
  },
] as const;

const seller = [
  {
    slug: 'start-selling',
    title: 'Start selling on Storegrill',
    description: 'Apply, complete identity verification, set up your store profile, and go live across every region.',
  },
  {
    slug: 'product-listings',
    title: 'List your products',
    description: 'Add products and variants by hand, set per-region prices and stock, and keep listings in good standing.',
  },
  {
    slug: 'bulk-imports',
    title: 'Bulk product imports',
    description: 'Upload a CSV, import from a URL feed or FTP/SFTP folder, and review staged changes before they go live.',
  },
  {
    slug: 'fulfillment-payouts',
    title: 'Fulfillment & payouts',
    description: 'Ship orders, add tracking numbers, and follow your payout ledger from pending to paid.',
  },
] as const;

export const CUSTOMER_GUIDES: GuideEntry[] = customer.map(g => ({
  ...g,
  path: `/help/guides/${g.slug}`,
}));

export const SELLER_GUIDES: GuideEntry[] = seller.map(g => ({
  ...g,
  path: `/sell/guides/${g.slug}`,
}));

export const ALL_WEB_GUIDE_PATHS: string[] = [
  '/help/guides',
  '/sell/guides',
  ...CUSTOMER_GUIDES.map(g => g.path),
  ...SELLER_GUIDES.map(g => g.path),
];
