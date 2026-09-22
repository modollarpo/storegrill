export type VendorGuideBlock =
  | { kind: 'para'; text: string }
  | { kind: 'list'; heading?: string; items: string[] }
  | { kind: 'steps'; items: string[] }
  | { kind: 'tip'; title: string; text: string };

export interface VendorGuideSection {
  heading: string;
  blocks: VendorGuideBlock[];
}

export interface VendorGuide {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  sections: VendorGuideSection[];
}

export const VENDOR_GUIDES: VendorGuide[] = [
  {
    slug: 'onboarding',
    title: 'Onboarding checklist',
    subtitle: 'From application to first live listing',
    description:
      'Complete your store setup in order: identity, bank details, store profile, then products. Do not skip verification — nothing goes live until it passes.',
    sections: [
      {
        heading: 'Complete your application',
        blocks: [
          { kind: 'para', text: 'The application asks for your business name, registered address, tax number where applicable and a contact email. Keep these identical to your registration documents.' },
          { kind: 'steps', items: ['Open the application form and enter business details.', 'Submit identity documents (government ID and any business registration evidence).', 'Add the bank account or payout method that will receive settlements.', 'Wait for the review email — typical processing is two working days.'] },
        ],
      },
      {
        heading: 'Verify your identity',
        blocks: [
          { kind: 'para', text: 'Identity verification unlocks listing. Blurry, truncated or expired documents delay approval, so photograph the full document in flat, even light.' },
          { kind: 'list', heading: 'Status appears under Settings:', items: ['Pending — documents submitted, awaiting review.', 'Verified — you can publish products.', 'Rejected — a brief reason is shown; fix and resubmit.'] },
        ],
      },
      {
        heading: 'Set up your store',
        blocks: [
          { kind: 'para', text: 'Choose a store name, upload a logo and banner, and write the short description shoppers see on your profile. Keep it factual and consistent with your listings.' },
          { kind: 'tip', title: 'Store profile equals trust', text: 'A complete profile with a real logo and clear description converts measurably better than a bare template store.' },
        ],
      },
      {
        heading: 'Publish your first product',
        blocks: [
          { kind: 'para', text: 'Add a single product by hand to confirm the flow, then use bulk imports for the rest. See the catalog and imports guides for the details.' },
        ],
      },
    ],
  },
  {
    slug: 'catalog',
    title: 'Managing your catalog',
    subtitle: 'Products, variants and per-region pricing',
    description:
      'Products are global; price and stock are regional. Learn how to build, edit and moderate a healthy catalog.',
    sections: [
      {
        heading: 'Create a product',
        blocks: [
          { kind: 'para', text: 'Go to Catalog → Add product. The title, description and photos apply in every region. Pricing and stock are configured per region because demand and costs differ.' },
          { kind: 'steps', items: ['Fill in title, description and at least one photo.', 'Add variants (size, colour, model) each with its own SKU.', 'Set price in minor units and stock for each region you sell in.', 'Save as draft, preview, then publish.'] },
        ],
      },
      {
        heading: 'Variants',
        blocks: [
          { kind: 'para', text: 'Variants are distinct sellable rows under one product. Give each a stable SKU: imports and orders both key on it. Changing a SKU later creates duplicates instead of updates.' },
          { kind: 'list', heading: 'Best practice:', items: ['One material, one variant.', 'Keep SKUs stable across uploads.', 'Set different stock per variant when supplies differ.'] },
        ],
      },
      {
        heading: 'Per-region price and stock',
        blocks: [
          { kind: 'para', text: 'Every product carries a regional price and stock quantity. Prices are exact minor-unit integers with a currency code — never floats. When a shopper opens your product they see the configuration for their own region.' },
        ],
      },
      {
        heading: 'Keep listings in good standing',
        blocks: [
          { kind: 'para', text: 'Our moderation team may unpublish listings that mislead shoppers or fail to ship on time. Update stock honestly, refresh photos that go stale and archive discontinued lines.' },
        ],
      },
    ],
  },
  {
    slug: 'imports',
    title: 'Bulk imports',
    subtitle: 'CSV uploads, URL feeds and FTP/SFTP',
    description:
      'Import hundreds of products without touching each one. Uploads and feeds share the same staged review before anything publishes.',
    sections: [
      {
        heading: 'CSV upload',
        blocks: [
          { kind: 'para', text: 'Download the template from Catalog → Bulk imports, then fill one row per variant. Columns map to SKU, title, description, category, regional price and regional stock.' },
          { kind: 'steps', items: ['Fill the template — one row per variant.', 'Upload the file.', 'Fix rows flagged by validation and re-upload.', 'Review the staged diff and confirm to publish.'] },
        ],
      },
      {
        heading: 'URL and FTP/SFTP feeds',
        blocks: [
          { kind: 'para', text: 'Point us at a product feed on a public URL or an FTP/SFTP folder. We poll on a schedule: new SKUs are added, changed prices update and removed rows can be marked out of stock.' },
        ],
      },
      {
        heading: 'Staged previews',
        blocks: [
          { kind: 'para', text: 'Every import produces a preview showing what will be created, what will be updated and which rows failed. Nothing touches the live storefront until you confirm.' },
          { kind: 'tip', title: 'Review before you publish', text: 'Check prices and stock once per file. The staged diff is your chance to catch typos that affect every region.' },
        ],
      },
      {
        heading: 'Validation rules',
        blocks: [
          { kind: 'para', text: 'Rows fail when prices are missing or zero, currency codes are unknown, stock is negative, or a regional column has no matching configuration. The error report lists the row and reason for every failed line.' },
        ],
      },
    ],
  },
  {
    slug: 'fulfillment',
    title: 'Orders & fulfillment',
    subtitle: 'Ship fast, scan tracking numbers',
    description:
      'The order queue, shipping steps and what happens when stock runs out. Late shipping is the fastest way to hurt your standing.',
    sections: [
      {
        heading: 'The order queue',
        blocks: [
          { kind: 'para', text: 'New orders appear in Orders. Each line shows the items, the regional delivery address and the shipping window you committed to. Filters separate awaiting-shipment from shipped and returned.' },
        ],
      },
      {
        heading: 'Ship within the window',
        blocks: [
          { kind: 'steps', items: ['Open the order and confirm the items and address.', 'Pick and pack.', 'Add the carrier and tracking number.', 'Mark shipped — the customer immediately sees your tracking.'] },
        ],
      },
      {
        heading: 'Labels and carriers',
        blocks: [
          { kind: 'para', text: 'Where a pre-negotiated regional label is available, generate it in the portal. Otherwise enter your own carrier and tracking number. Scanning early prevents customer queries.' },
        ],
      },
      {
        heading: 'Out of stock?',
        blocks: [
          { kind: 'tip', title: 'Never silently cancel', text: 'If you cannot fulfill, contact support before the shipping window passes. We normally arrange a replacement or refund so you avoid a late-shipment strike.' },
        ],
      },
    ],
  },
  {
    slug: 'payouts',
    title: 'Payouts & settlement',
    subtitle: 'Reading the ledger, period to period',
    description:
      'Every order in the ledger: sale value, commission, adjustments and net payable. Learn the lifecycle from pending to paid.',
    sections: [
      {
        heading: 'Reading your ledger',
        blocks: [
          { kind: 'list', heading: 'Statuses:', items: ['Pending — order cleared, not yet in a payout batch.', 'Processing — included in the current settlement.', 'Paid — money transferred on the stated date.', 'Negative lines — refunds, chargebacks and adjustments.'] },
        ],
      },
      {
        heading: 'The settlement window',
        blocks: [
          { kind: 'para', text: 'Payouts release on the schedule shown in the portal, typically after the return window for each order. The ledger shows the settlement date of every order so totals always reconcile.' },
        ],
      },
      {
        heading: 'Reconciling',
        blocks: [
          { kind: 'para', text: 'Monthly reconciliation is quick: add your Paid lines and match them to your bank statement. Discrepancies go to support with the payout ID.' },
        ],
      },
      {
        heading: 'Disputes',
        blocks: [
          { kind: 'para', text: 'If you believe an adjustment is wrong, open a dispute from the payout line within the period shown. Include your payout ID and the order number so review is fast.' },
        ],
      },
    ],
  },
  {
    slug: 'deals',
    title: 'Deals & promotions',
    subtitle: 'Creating offers and coupon codes',
    description:
      'Promote slow movers and seasonal lines with regional deals and coupons. Understand limits, scheduling and reporting.',
    sections: [
      {
        heading: 'Types of promotion',
        blocks: [
          { kind: 'list', items: ['Deals — a discounted price on a product for a set period.', 'Coupons — codes shoppers apply at checkout.', 'Trending placement — applying for the editorial carousel.'] },
        ],
      },
      {
        heading: 'Create a deal',
        blocks: [
          { kind: 'steps', items: ['Open Deals → Create deal.', 'Pick the product and the discounted price in minor units.', 'Set a start, end and stock cap.', 'Submit for approval — most deals approve in a working day.'] },
        ],
      },
      {
        heading: 'Coupon codes',
        blocks: [
          { kind: 'para', text: 'Coupons are single-use per checkout and limited per customer. Set the discount, the budget and a validity window. One code per checkout maximum.' },
        ],
      },
      {
        heading: 'Measure the results',
        blocks: [
          { kind: 'para', text: 'Deal performance (units sold, views, conversion) rolls up into your dashboard. Use the numbers to decide whether to rerun a deal next period.' },
        ],
      },
    ],
  },
];

export function vendorGuideBySlug(slug: string): VendorGuide | undefined {
  return VENDOR_GUIDES.find(g => g.slug === slug);
}