import './src/load-env.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
  console.error('Refusing to run the demo seed with NODE_ENV=production. Use scripts/bootstrap-prod.ts instead.');
  process.exit(1);
}

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', children: [
    { name: 'Smartphones', slug: 'smartphones' },
    { name: 'Laptops', slug: 'laptops' },
    { name: 'Audio', slug: 'audio' },
    { name: 'Cameras', slug: 'cameras' },
  ]},
  { name: 'Clothing', slug: 'clothing', children: [
    { name: "Men's Clothing", slug: 'mens-clothing' },
    { name: "Women's Clothing", slug: 'womens-clothing' },
    { name: 'Shoes', slug: 'shoes' },
    { name: 'Accessories', slug: 'accessories' },
  ]},
  { name: 'Home & Garden', slug: 'home-garden', children: [
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Kitchen', slug: 'kitchen' },
    { name: 'Bedding', slug: 'bedding' },
    { name: 'Garden Tools', slug: 'garden-tools' },
  ]},
  { name: 'Sports & Outdoors', slug: 'sports-outdoors', children: [
    { name: 'Fitness', slug: 'fitness' },
    { name: 'Camping', slug: 'camping' },
    { name: 'Cycling', slug: 'cycling' },
  ]},
  { name: 'Books', slug: 'books', children: [
    { name: 'Fiction', slug: 'fiction' },
    { name: 'Non-Fiction', slug: 'non-fiction' },
    { name: 'Textbooks', slug: 'textbooks' },
  ]},
];

const BRANDS = [
  { name: 'TechVibe', slug: 'techvibe' },
  { name: 'UrbanStyle', slug: 'urbanstyle' },
  { name: 'HomeCraft', slug: 'homecraft' },
  { name: 'ProFit', slug: 'profit' },
  { name: 'ReadMore', slug: 'readmore' },
  { name: 'AudioMax', slug: 'audiomax' },
  { name: 'LensPro', slug: 'lenspro' },
  { name: 'ComfortLiving', slug: 'comfortliving' },
];

const VENDORS = [
  {
    storeName: 'TechHub Official',
    slug: 'techhub-official',
    description: 'Your one-stop shop for the latest technology gadgets and electronics. We source directly from manufacturers.',
    categories: ['electronics'],
  },
  {
    storeName: 'Fashion Forward',
    slug: 'fashion-forward',
    description: 'Trendy clothing and accessories for the modern lifestyle. New collections every season.',
    categories: ['clothing'],
  },
  {
    storeName: 'Home Essentials',
    slug: 'home-essentials',
    description: 'Quality home goods at affordable prices. Transform your living space.',
    categories: ['home-garden'],
  },
  {
    storeName: 'SportZone',
    slug: 'sportzone',
    description: 'Premium sports equipment and outdoor gear. Gear up for your next adventure.',
    categories: ['sports-outdoors'],
  },
  {
    storeName: 'BookWorm Store',
    slug: 'bookworm-store',
    description: 'Curated collection of books across all genres. From bestsellers to rare finds.',
    categories: ['books'],
  },
];

const PRODUCTS: Array<{
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  sku: string;
  categorySlug: string;
  brandSlug: string;
  price: number;
  weight: number;
  tags: string[];
  attributes: Array<{ name: string; value: string }>;
  variants?: Array<{ name: string; sku: string; price: number; stock: number; attributes: string }>;
  stock: number;
}> = [
  {
    name: 'ProMax Wireless Earbuds',
    slug: 'promax-wireless-earbuds',
    description: 'Experience crystal-clear audio with our ProMax Wireless Earbuds. Featuring active noise cancellation, 30-hour battery life, and IPX5 water resistance. Perfect for commutes, workouts, and everyday listening.',
    shortDescription: 'Premium wireless earbuds with ANC and 30-hour battery',
    sku: 'TV-ear-001',
    categorySlug: 'audio',
    brandSlug: 'audiomax',
    price: 7999,
    weight: 50,
    tags: ['wireless', 'earbuds', 'bluetooth', 'noise-cancelling'],
    attributes: [
      { name: 'Color', value: 'Black' },
      { name: 'Connectivity', value: 'Bluetooth 5.3' },
      { name: 'Battery Life', value: '30 hours' },
    ],
    variants: [
      { name: 'Black', sku: 'TV-ear-001-BLK', price: 7999, stock: 150, attributes: '{"Color":"Black"}' },
      { name: 'White', sku: 'TV-ear-001-WHT', price: 7999, stock: 120, attributes: '{"Color":"White"}' },
      { name: 'Navy', sku: 'TV-ear-001-NVY', price: 8499, stock: 80, attributes: '{"Color":"Navy"}' },
    ],
    stock: 350,
  },
  {
    name: 'UltraSlim Laptop Stand',
    slug: 'ultraslim-laptop-stand',
    description: 'Ergonomic aluminum laptop stand that elevates your screen to eye level. Adjustable height, foldable design, supports laptops up to 17 inches. Improves posture and reduces neck strain.',
    shortDescription: 'Adjustable aluminum laptop stand for ergonomic workspace',
    sku: 'HC-stand-001',
    categorySlug: 'electronics',
    brandSlug: 'homecraft',
    price: 3499,
    weight: 800,
    tags: ['laptop', 'stand', 'ergonomic', 'aluminum'],
    attributes: [
      { name: 'Material', value: 'Aluminum' },
      { name: 'Max Load', value: '10kg' },
      { name: 'Compatible', value: 'Up to 17"' },
    ],
    stock: 200,
  },
  {
    name: 'Smart Fitness Watch',
    slug: 'smart-fitness-watch',
    description: 'Track your health and fitness with precision. GPS tracking, heart rate monitor, sleep analysis, and 7-day battery life. Water-resistant to 50m.',
    shortDescription: 'Feature-packed smartwatch with GPS and health tracking',
    sku: 'PF-watch-001',
    categorySlug: 'fitness',
    brandSlug: 'profit',
    price: 14999,
    weight: 45,
    tags: ['smartwatch', 'fitness', 'health', 'gps'],
    attributes: [
      { name: 'Display', value: '1.4" AMOLED' },
      { name: 'Battery', value: '7 days' },
      { name: 'Water Resistance', value: '5ATM' },
    ],
    variants: [
      { name: 'Black', sku: 'PF-watch-001-BLK', price: 14999, stock: 100, attributes: '{"Color":"Black"}' },
      { name: 'Silver', sku: 'PF-watch-001-SLV', price: 14999, stock: 80, attributes: '{"Color":"Silver"}' },
      { name: 'Rose Gold', sku: 'PF-watch-001-RG', price: 15999, stock: 60, attributes: '{"Color":"Rose Gold"}' },
    ],
    stock: 240,
  },
  {
    name: 'Organic Cotton T-Shirt',
    slug: 'organic-cotton-tshirt',
    description: 'Soft, breathable organic cotton t-shirt. Ethically sourced and manufactured. Available in multiple colors. Machine washable.',
    shortDescription: 'Sustainable organic cotton t-shirt, ethically made',
    sku: 'US-tee-001',
    categorySlug: 'mens-clothing',
    brandSlug: 'urbanstyle',
    price: 2499,
    weight: 200,
    tags: ['tshirt', 'organic', 'cotton', 'sustainable'],
    attributes: [
      { name: 'Material', value: '100% Organic Cotton' },
      { name: 'Fit', value: 'Regular' },
    ],
    variants: [
      { name: 'S', sku: 'US-tee-001-S', price: 2499, stock: 50, attributes: '{"Size":"S"}' },
      { name: 'M', sku: 'US-tee-001-M', price: 2499, stock: 80, attributes: '{"Size":"M"}' },
      { name: 'L', sku: 'US-tee-001-L', price: 2499, stock: 70, attributes: '{"Size":"L"}' },
      { name: 'XL', sku: 'US-tee-001-XL', price: 2699, stock: 40, attributes: '{"Size":"XL"}' },
    ],
    stock: 240,
  },
  {
    name: 'Professional Camera Lens 50mm',
    slug: 'professional-camera-lens-50mm',
    description: 'Ultra-sharp 50mm f/1.8 prime lens. Perfect for portraits and low-light photography. Multi-coated glass elements for superior image quality.',
    shortDescription: '50mm f/1.8 prime lens for stunning portraits',
    sku: 'LP-lens-001',
    categorySlug: 'cameras',
    brandSlug: 'lenspro',
    price: 44999,
    weight: 350,
    tags: ['camera', 'lens', 'portrait', 'prime'],
    attributes: [
      { name: 'Focal Length', value: '50mm' },
      { name: 'Aperture', value: 'f/1.8' },
      { name: 'Mount', value: 'Universal' },
    ],
    stock: 45,
  },
  {
    name: 'Ergonomic Office Chair',
    slug: 'ergonomic-office-chair',
    description: 'Premium ergonomic office chair with lumbar support, adjustable armrests, and breathable mesh back. Designed for 8+ hours of comfortable sitting.',
    shortDescription: 'Fully adjustable ergonomic chair with lumbar support',
    sku: 'CL-chair-001',
    categorySlug: 'furniture',
    brandSlug: 'comfortliving',
    price: 29999,
    weight: 15000,
    tags: ['chair', 'ergonomic', 'office', 'mesh'],
    attributes: [
      { name: 'Material', value: 'Mesh + Steel' },
      { name: 'Max Weight', value: '150kg' },
      { name: 'Adjustable', value: 'Height, Arms, Tilt' },
    ],
    stock: 30,
  },
  {
    name: 'Camping Tent 4-Person',
    slug: 'camping-tent-4-person',
    description: 'Waterproof 4-person camping tent with easy setup. Features rainfly, vestibule, and ventilation windows. Perfect for weekend camping trips.',
    shortDescription: 'Waterproof 4-person tent with quick setup',
    sku: 'PF-tent-001',
    categorySlug: 'camping',
    brandSlug: 'profit',
    price: 8999,
    weight: 3500,
    tags: ['tent', 'camping', 'waterproof', 'outdoor'],
    attributes: [
      { name: 'Capacity', value: '4 persons' },
      { name: 'Season', value: '3-season' },
      { name: 'Waterproof', value: 'Yes' },
    ],
    stock: 60,
  },
  {
    name: 'Stainless Steel Water Bottle',
    slug: 'stainless-steel-water-bottle',
    description: 'Double-wall insulated stainless steel water bottle. Keeps drinks cold for 24 hours or hot for 12 hours. BPA-free, leak-proof.',
    shortDescription: 'Insulated water bottle, 24hr cold / 12hr hot',
    sku: 'PF-bottle-001',
    categorySlug: 'fitness',
    brandSlug: 'profit',
    price: 1999,
    weight: 350,
    tags: ['water-bottle', 'insulated', 'stainless', 'eco-friendly'],
    attributes: [
      { name: 'Capacity', value: '750ml' },
      { name: 'Material', value: 'Stainless Steel' },
    ],
    variants: [
      { name: 'Silver', sku: 'PF-bottle-001-SLV', price: 1999, stock: 200, attributes: '{"Color":"Silver"}' },
      { name: 'Black', sku: 'PF-bottle-001-BLK', price: 1999, stock: 180, attributes: '{"Color":"Black"}' },
      { name: 'Blue', sku: 'PF-bottle-001-BLU', price: 1999, stock: 150, attributes: '{"Color":"Blue"}' },
    ],
    stock: 530,
  },
  {
    name: 'Bestseller Novel Collection',
    slug: 'bestseller-novel-collection',
    description: 'Set of 3 award-winning contemporary novels. Includes book club discussion guides. Perfect gift for book lovers.',
    shortDescription: '3-book set of award-winning contemporary novels',
    sku: 'RM-books-001',
    categorySlug: 'fiction',
    brandSlug: 'readmore',
    price: 3499,
    weight: 800,
    tags: ['books', 'novel', 'fiction', 'bestseller'],
    attributes: [
      { name: 'Format', value: 'Paperback' },
      { name: 'Pages', value: '900+ total' },
    ],
    stock: 100,
  },
  {
    name: 'Wireless Bluetooth Speaker',
    slug: 'wireless-bluetooth-speaker',
    description: 'Portable Bluetooth speaker with 360-degree sound, 20-hour battery, and rugged waterproof design. Perfect for outdoor adventures.',
    shortDescription: 'Portable waterproof speaker with 360Â° sound',
    sku: 'TV-speaker-001',
    categorySlug: 'audio',
    brandSlug: 'techvibe',
    price: 5999,
    weight: 600,
    tags: ['speaker', 'bluetooth', 'wireless', 'waterproof'],
    attributes: [
      { name: 'Battery', value: '20 hours' },
      { name: 'Waterproof', value: 'IPX7' },
      { name: 'Range', value: '30m' },
    ],
    variants: [
      { name: 'Black', sku: 'TV-speaker-001-BLK', price: 5999, stock: 100, attributes: '{"Color":"Black"}' },
      { name: 'Red', sku: 'TV-speaker-001-RED', price: 5999, stock: 80, attributes: '{"Color":"Red"}' },
    ],
    stock: 180,
  },
  {
    name: 'Premium Yoga Mat',
    slug: 'premium-yoga-mat',
    description: 'Non-slip premium yoga mat with alignment lines. 6mm thick for joint comfort. Eco-friendly TPE material. Includes carrying strap.',
    shortDescription: 'Non-slip eco yoga mat with alignment guides',
    sku: 'PF-yoga-001',
    categorySlug: 'fitness',
    brandSlug: 'profit',
    price: 3999,
    weight: 1200,
    tags: ['yoga', 'mat', 'fitness', 'eco-friendly'],
    attributes: [
      { name: 'Thickness', value: '6mm' },
      { name: 'Material', value: 'TPE' },
      { name: 'Size', value: '183cm x 61cm' },
    ],
    stock: 90,
  },
  {
    name: 'LED Desk Lamp',
    slug: 'led-desk-lamp',
    description: 'Adjustable LED desk lamp with 5 brightness levels and 3 color temperatures. USB charging port, touch controls, and 50,000-hour lifespan.',
    shortDescription: 'Modern LED desk lamp with USB charging',
    sku: 'HC-lamp-001',
    categorySlug: 'furniture',
    brandSlug: 'homecraft',
    price: 2999,
    weight: 800,
    tags: ['lamp', 'led', 'desk', 'usb'],
    attributes: [
      { name: 'Brightness Levels', value: '5' },
      { name: 'Color Temperature', value: '3000K-6500K' },
    ],
    stock: 120,
  },
];

function jsonArr(arr: any[]): string {
  return JSON.stringify(arr);
}

async function main() {
  console.log('Seeding database...');

  await prisma.$executeRaw`DELETE FROM "SearchSynonym"`;
  await prisma.$executeRaw`DELETE FROM "AuditLog"`;
  await prisma.$executeRaw`DELETE FROM "Notification"`;
  await prisma.$executeRaw`DELETE FROM "ImportJobResult"`;
  await prisma.$executeRaw`DELETE FROM "ImportJob"`;
  await prisma.$executeRaw`DELETE FROM "ImportSchedule"`;
  await prisma.$executeRaw`DELETE FROM "PayoutLine"`;
  await prisma.$executeRaw`DELETE FROM "Payout"`;
  await prisma.$executeRaw`DELETE FROM "Review"`;
  await prisma.$executeRaw`DELETE FROM "Coupon"`;
  await prisma.$executeRaw`DELETE FROM "DealVariant"`;
  await prisma.$executeRaw`DELETE FROM "Deal"`;
  await prisma.$executeRaw`DELETE FROM "ShipmentEvent"`;
  await prisma.$executeRaw`DELETE FROM "Shipment"`;
  await prisma.$executeRaw`DELETE FROM "Refund"`;
  await prisma.$executeRaw`DELETE FROM "Payment"`;
  await prisma.$executeRaw`DELETE FROM "OrderItem"`;
  await prisma.$executeRaw`DELETE FROM "Order"`;
  await prisma.$executeRaw`DELETE FROM "CartItem"`;
  await prisma.$executeRaw`DELETE FROM "Cart"`;
  await prisma.$executeRaw`DELETE FROM "InventoryLedger"`;
  await prisma.$executeRaw`DELETE FROM "Warehouse"`;
  await prisma.$executeRaw`DELETE FROM "ProductRegionPrice"`;
  await prisma.$executeRaw`DELETE FROM "ProductVariant"`;
  await prisma.$executeRaw`DELETE FROM "Product"`;
  await prisma.$executeRaw`DELETE FROM "Storefront"`;
  await prisma.$executeRaw`DELETE FROM "VendorProfile"`;
  await prisma.$executeRaw`DELETE FROM "CustomerProfile"`;
  await prisma.$executeRaw`DELETE FROM "User"`;
  await prisma.$executeRaw`DELETE FROM "Category"`;
  await prisma.$executeRaw`DELETE FROM "Brand"`;
  await prisma.$executeRaw`DELETE FROM "ShippingZone"`;
  await prisma.$executeRaw`DELETE FROM "TaxRule"`;
  await prisma.$executeRaw`DELETE FROM "Region"`;

  const password = await bcrypt.hash('Password123', 12);

  const regions = await Promise.all([
    prisma.region.create({ data: { key: 'UK', name: 'United Kingdom', languages: 'en', defaultLanguage: 'en', currencies: 'GBP', defaultCurrency: 'GBP', defaultTimezone: 'Europe/London' } }),
    prisma.region.create({ data: { key: 'US', name: 'United States', languages: 'en', defaultLanguage: 'en', currencies: 'USD', defaultCurrency: 'USD', defaultTimezone: 'America/New_York' } }),
    prisma.region.create({ data: { key: 'EU', name: 'European Union', languages: 'en,de,fr', defaultLanguage: 'en', currencies: 'EUR', defaultCurrency: 'EUR', defaultTimezone: 'Europe/Berlin' } }),
    prisma.region.create({ data: { key: 'IN', name: 'India', languages: 'en,hi', defaultLanguage: 'en', currencies: 'INR', defaultCurrency: 'INR', defaultTimezone: 'Asia/Kolkata' } }),
    prisma.region.create({ data: { key: 'NG', name: 'Nigeria', languages: 'en,ha,yo,ig', defaultLanguage: 'en', currencies: 'NGN', defaultCurrency: 'NGN', defaultTimezone: 'Africa/Lagos' } }),
    prisma.region.create({ data: { key: 'GH', name: 'Ghana', languages: 'en', defaultLanguage: 'en', currencies: 'GHS', defaultCurrency: 'GHS', defaultTimezone: 'Africa/Accra' } }),
    prisma.region.create({ data: { key: 'KE', name: 'Kenya', languages: 'en,sw', defaultLanguage: 'en', currencies: 'KES', defaultCurrency: 'KES', defaultTimezone: 'Africa/Nairobi' } }),
    prisma.region.create({ data: { key: 'UG', name: 'Uganda', languages: 'en,sw', defaultLanguage: 'en', currencies: 'UGX', defaultCurrency: 'UGX', defaultTimezone: 'Africa/Kampala' } }),
    prisma.region.create({ data: { key: 'ZA', name: 'South Africa', languages: 'en,af,zu', defaultLanguage: 'en', currencies: 'ZAR', defaultCurrency: 'ZAR', defaultTimezone: 'Africa/Johannesburg' } }),
    prisma.region.create({ data: { key: 'EG', name: 'Egypt', languages: 'ar,en', defaultLanguage: 'ar', currencies: 'EGP', defaultCurrency: 'EGP', defaultTimezone: 'Africa/Cairo' } }),
    prisma.region.create({ data: { key: 'MA', name: 'Morocco', languages: 'ar,fr,en', defaultLanguage: 'ar', currencies: 'MAD', defaultCurrency: 'MAD', defaultTimezone: 'Africa/Casablanca' } }),
    prisma.region.create({ data: { key: 'TZ', name: 'Tanzania', languages: 'sw,en', defaultLanguage: 'sw', currencies: 'TZS', defaultCurrency: 'TZS', defaultTimezone: 'Africa/Dar_es_Salaam' } }),
  ]);

  await Promise.all([
    prisma.taxRule.create({ data: { regionKey: 'UK', name: 'VAT', rate: 0.20, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'US', name: 'Sales Tax', rate: 0.0825, type: 'SALES_TAX' } }),
    prisma.taxRule.create({ data: { regionKey: 'EU', name: 'VAT', rate: 0.19, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'IN', name: 'GST', rate: 0.18, type: 'GST' } }),
    prisma.taxRule.create({ data: { regionKey: 'NG', name: 'VAT', rate: 0.075, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'GH', name: 'VAT', rate: 0.15, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'KE', name: 'VAT', rate: 0.16, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'UG', name: 'VAT', rate: 0.18, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'ZA', name: 'VAT', rate: 0.15, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'EG', name: 'VAT', rate: 0.14, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'MA', name: 'TVA', rate: 0.20, type: 'VAT' } }),
    prisma.taxRule.create({ data: { regionKey: 'TZ', name: 'VAT', rate: 0.18, type: 'VAT' } }),
  ]);

  await Promise.all([
    prisma.shippingZone.create({ data: { regionKey: 'UK', name: 'UK Standard', countries: 'GB', baseRateMinorUnits: 399, currencyCode: 'GBP', perKgRateMinorUnits: 99, freeShippingThresholdMinorUnits: 3500, estimatedDaysMin: 1, estimatedDaysMax: 4, carriers: 'Royal Mail,Evri,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'US', name: 'US Standard', countries: 'US', baseRateMinorUnits: 599, currencyCode: 'USD', perKgRateMinorUnits: 100, freeShippingThresholdMinorUnits: 3500, estimatedDaysMin: 3, estimatedDaysMax: 7, carriers: 'UPS,FedEx,USPS' } }),
    prisma.shippingZone.create({ data: { regionKey: 'EU', name: 'EU Standard', countries: 'DE,FR,ES,IT,NL', baseRateMinorUnits: 499, currencyCode: 'EUR', perKgRateMinorUnits: 120, freeShippingThresholdMinorUnits: 4000, estimatedDaysMin: 2, estimatedDaysMax: 5, carriers: 'DHL,DPD' } }),
    prisma.shippingZone.create({ data: { regionKey: 'IN', name: 'India International', countries: 'IN', baseRateMinorUnits: 49500, currencyCode: 'INR', perKgRateMinorUnits: 9000, estimatedDaysMin: 7, estimatedDaysMax: 14, carriers: 'Delhivery,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'NG', name: 'Nigeria International', countries: 'NG', baseRateMinorUnits: 1450000, currencyCode: 'NGN', perKgRateMinorUnits: 320000, estimatedDaysMin: 7, estimatedDaysMax: 14, carriers: 'Red Star Express,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'GH', name: 'Ghana International', countries: 'GH', baseRateMinorUnits: 18000, currencyCode: 'GHS', perKgRateMinorUnits: 4000, estimatedDaysMin: 7, estimatedDaysMax: 14, carriers: 'Ghana Post,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'KE', name: 'Kenya International', countries: 'KE', baseRateMinorUnits: 195000, currencyCode: 'KES', perKgRateMinorUnits: 43000, estimatedDaysMin: 7, estimatedDaysMax: 14, carriers: 'G4S Courier,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'UG', name: 'Uganda International', countries: 'UG', baseRateMinorUnits: 5500000, currencyCode: 'UGX', perKgRateMinorUnits: 1200000, estimatedDaysMin: 7, estimatedDaysMax: 14, carriers: 'Posta Uganda,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'ZA', name: 'South Africa International', countries: 'ZA,NA,BW,LS,SZ', baseRateMinorUnits: 22000, currencyCode: 'ZAR', perKgRateMinorUnits: 3000, estimatedDaysMin: 7, estimatedDaysMax: 12, carriers: 'DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'EG', name: 'Egypt International', countries: 'EG', baseRateMinorUnits: 60000, currencyCode: 'EGP', perKgRateMinorUnits: 12000, estimatedDaysMin: 6, estimatedDaysMax: 12, carriers: 'Aramex,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'MA', name: 'Morocco International', countries: 'MA,EH', baseRateMinorUnits: 12000, currencyCode: 'MAD', perKgRateMinorUnits: 2400, estimatedDaysMin: 6, estimatedDaysMax: 12, carriers: 'CTM Messagerie,DHL' } }),
    prisma.shippingZone.create({ data: { regionKey: 'TZ', name: 'Tanzania International', countries: 'TZ', baseRateMinorUnits: 4800000, currencyCode: 'TZS', perKgRateMinorUnits: 1200000, estimatedDaysMin: 7, estimatedDaysMax: 14, carriers: 'Posta Tanzania,DHL' } }),
  ]);

  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const parent = await prisma.category.create({ data: { name: cat.name, slug: cat.slug } });
    categoryMap.set(cat.slug, parent.id);
    for (const child of cat.children) {
      const c = await prisma.category.create({ data: { name: child.name, slug: child.slug, parentId: parent.id } });
      categoryMap.set(child.slug, c.id);
    }
  }

  const brandMap = new Map<string, string>();
  for (const brand of BRANDS) {
    const b = await prisma.brand.create({ data: { name: brand.name, slug: brand.slug } });
    brandMap.set(brand.slug, b.id);
  }

  const customer = await prisma.user.create({
    data: {
      email: 'customer@storegrill.net',
      password,
      name: 'John Customer',
      role: 'CUSTOMER',
      customerProfile: { create: { preferredRegionKey: 'UK', defaultCurrency: 'GBP', defaultLanguage: 'en', shippingAddresses: jsonArr([{ id: '1', label: 'Home', street: '42 Wellington Road', city: 'Manchester', state: '', zip: 'M14 5TP', country: 'GB', isDefault: true }]) } },
    },
  });

  const admin = await prisma.user.create({
    data: { email: 'admin@storegrill.net', password, name: 'Admin User', role: 'ADMIN' },
  });

  await prisma.platformConfig.upsert({
    where: { key: 'vendorCommissionPct' },
    update: {},
    create: { key: 'vendorCommissionPct', value: '12' },
  });

  const vendorUsers = await Promise.all(
    VENDORS.map((v, i) =>
      prisma.user.create({
        data: {
          email: `vendor${i + 1}@storegrill.net`,
          password,
          name: `${v.storeName} Owner`,
          role: 'VENDOR',
        },
      })
    )
  );

  const vendorProfiles = await Promise.all(
    vendorUsers.map((u, i) =>
      prisma.vendorProfile.create({
        data: {
          userId: u.id,
          storeName: VENDORS[i].storeName,
          slug: VENDORS[i].slug,
          description: VENDORS[i].description,
          status: 'ACTIVE',
          kycStatus: 'APPROVED',
          revenueSharePct: 15,
          rating: 4 + Math.random(),
          reviewCount: Math.floor(Math.random() * 100),
        },
      })
    )
  );

  const houseVendorUser = await prisma.user.create({
    data: {
      email: 'storegrill-uk@storegrill.net',
      password,
      name: 'Storegrill UK',
      role: 'VENDOR',
    },
  });

  const houseVendor = await prisma.vendorProfile.create({
    data: {
      userId: houseVendorUser.id,
      storeName: 'Storegrill UK',
      slug: 'storegrill-uk',
      description: 'Storegrill UK flagship catalogue, powered by the Costway dropship feed.',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      revenueSharePct: 0,
      warehouseRegionKey: 'UK',
      isHouseVendor: true,
      autoPublishImports: true,
      shippingMode: 'FLAT',
      shippingFlatMinorUnits: 999,
      shippingCountries: JSON.stringify(['GB']),
    },
  });

  let vendorIdx = 0;
  const allProducts: any[] = [];

  for (const product of PRODUCTS) {
    const vendor = vendorProfiles[vendorIdx % vendorProfiles.length];
    vendorIdx++;

    const p = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        sku: product.sku,
        categoryId: categoryMap.get(product.categorySlug) || categoryMap.values().next().value,
        brandId: brandMap.get(product.brandSlug),
        images: jsonArr([`https://placehold.co/800x800?text=${encodeURIComponent(product.name)}`]),
        thumbnail: `https://placehold.co/400x400?text=${encodeURIComponent(product.name)}`,
        basePriceMinorUnits: product.price,
        currencyCode: 'USD',
        weightGrams: product.weight,
        tags: jsonArr(product.tags),
        attributes: jsonArr(product.attributes),
        status: 'ACTIVE',
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(Math.random() * 50),
        totalSales: Math.floor(Math.random() * 200),
      },
    });

    allProducts.push(p);

    if (product.variants) {
      for (const v of product.variants) {
        await prisma.productVariant.create({
          data: {
            productId: p.id,
            name: v.name,
            sku: v.sku,
            basePriceMinorUnits: v.price,
            stock: v.stock,
            images: jsonArr([`https://placehold.co/400x400?text=${encodeURIComponent(v.name)}`]),
            attributes: v.attributes,
          },
        });
      }
    }

    for (const region of regions) {
      const multiplier = region.key === 'US' ? 1 : region.key === 'UK' ? 0.8 : region.key === 'EU' ? 1.1 : 83;
      await prisma.productRegionPrice.create({
        data: {
          productId: p.id,
          regionKey: region.key,
          priceMinorUnits: Math.round(product.price * multiplier),
          currencyCode: region.defaultCurrency,
        },
      });
    }
  }

  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        name: 'Summer Tech Sale',
        slug: 'summer-tech-sale',
        description: 'Up to 30% off on electronics this summer',
        type: 'PERCENTAGE_OFF',
        value: 30,
        maxDiscount: 5000,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        regionKey: 'US',
        enabled: true,
        categoryIds: jsonArr([categoryMap.get('electronics'), categoryMap.get('audio')]),
      },
    }),
    prisma.deal.create({
      data: {
        name: 'Free Shipping Week',
        slug: 'free-shipping-week',
        description: 'Free shipping on all orders over $25',
        type: 'FIXED_AMOUNT',
        value: 5.99,
        minOrderAmount: 2500,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        enabled: true,
        categoryIds: jsonArr([]),
      },
    }),
  ]);

  await prisma.coupon.create({
    data: { dealId: deals[0].id, code: 'SUMMER30', maxUses: 100, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });
  await prisma.coupon.create({
    data: { dealId: deals[1].id, code: 'FREESHIP', maxUses: 500, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  for (const product of allProducts.slice(0, 8)) {
    await prisma.review.create({
      data: {
        userId: customer.id,
        productId: product.id,
        rating: Math.floor(3 + Math.random() * 3),
        title: 'Great product!',
        body: 'Really happy with this purchase. Quality is excellent and shipping was fast.',
        verified: true,
        status: 'APPROVED',
      },
    });
  }

  console.log('Seed complete!');
  console.log(`Created ${regions.length} regions`);
  console.log(`Created ${CATEGORIES.length} categories (with subcategories)`);
  console.log(`Created ${BRANDS.length} brands`);
  console.log(`Created ${VENDORS.length} vendors`);
  console.log(`Created house vendor: ${houseVendor.storeName} <${houseVendorUser.email}> / Password123 (flat Â£10 shipping, auto-publish)`);
  console.log(`Created ${allProducts.length} products`);
  console.log(`Created ${deals.length} deals with coupons`);
  console.log(`Created customer: customer@storegrill.net / Password123`);
  console.log(`Created admin: admin@storegrill.net / Password123`);
  console.log(`Created vendors: vendor1@storegrill.net - vendor5@storegrill.net / Password123`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
