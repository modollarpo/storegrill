import '../src/load-env.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
  console.error('Set DATABASE_URL to the pod PostgreSQL connection string first.');
  process.exit(1);
}

interface RegionConfig {
  name: string;
  languages: string;
  defaultLanguage: string;
  currencies: string;
  defaultCurrency: string;
  defaultTimezone: string;
  tax: { name: string; rate: number; type: string };
  shipping: {
    name: string;
    countries: string;
    baseRateMinorUnits: number;
    currencyCode: string;
    perKgRateMinorUnits: number;
    freeShippingThresholdMinorUnits: number;
    estimatedDaysMin: number;
    estimatedDaysMax: number;
    carriers: string;
  };
}

const REGIONS: Record<string, RegionConfig> = {
  EU: {
    name: 'European Union',
    languages: 'en,de,fr',
    defaultLanguage: 'en',
    currencies: 'EUR',
    defaultCurrency: 'EUR',
    defaultTimezone: 'Europe/Berlin',
    tax: { name: 'VAT', rate: 0.19, type: 'VAT' },
    shipping: {
      name: 'EU Standard',
      countries: 'DE,FR,ES,IT,NL',
      baseRateMinorUnits: 499,
      currencyCode: 'EUR',
      perKgRateMinorUnits: 120,
      freeShippingThresholdMinorUnits: 4000,
      estimatedDaysMin: 2,
      estimatedDaysMax: 5,
      carriers: 'DHL,DPD',
    },
  },
  UK: {
    name: 'United Kingdom',
    languages: 'en',
    defaultLanguage: 'en',
    currencies: 'GBP',
    defaultCurrency: 'GBP',
    defaultTimezone: 'Europe/London',
    tax: { name: 'VAT', rate: 0.2, type: 'VAT' },
    shipping: {
      name: 'UK Standard',
      countries: 'GB',
      baseRateMinorUnits: 399,
      currencyCode: 'GBP',
      perKgRateMinorUnits: 99,
      freeShippingThresholdMinorUnits: 3500,
      estimatedDaysMin: 1,
      estimatedDaysMax: 4,
      carriers: 'Royal Mail,Evri,DHL',
    },
  },
  US: {
    name: 'United States',
    languages: 'en',
    defaultLanguage: 'en',
    currencies: 'USD',
    defaultCurrency: 'USD',
    defaultTimezone: 'America/New_York',
    tax: { name: 'Sales Tax', rate: 0.0825, type: 'SALES_TAX' },
    shipping: {
      name: 'US Standard',
      countries: 'US',
      baseRateMinorUnits: 599,
      currencyCode: 'USD',
      perKgRateMinorUnits: 100,
      freeShippingThresholdMinorUnits: 3500,
      estimatedDaysMin: 3,
      estimatedDaysMax: 7,
      carriers: 'UPS,FedEx,USPS',
    },
  },
  NG: {
    name: 'Nigeria',
    languages: 'en,ha,yo,ig',
    defaultLanguage: 'en',
    currencies: 'NGN',
    defaultCurrency: 'NGN',
    defaultTimezone: 'Africa/Lagos',
    tax: { name: 'VAT', rate: 0.075, type: 'VAT' },
    shipping: {
      name: 'Nigeria International',
      countries: 'NG',
      baseRateMinorUnits: 1450000,
      currencyCode: 'NGN',
      perKgRateMinorUnits: 320000,
      freeShippingThresholdMinorUnits: 25000000,
      estimatedDaysMin: 7,
      estimatedDaysMax: 14,
      carriers: 'Red Star Express,DHL',
    },
  },
  AE: {
    name: 'United Arab Emirates',
    languages: 'en,ar',
    defaultLanguage: 'en',
    currencies: 'AED',
    defaultCurrency: 'AED',
    defaultTimezone: 'Asia/Dubai',
    tax: { name: 'VAT', rate: 0.05, type: 'VAT' },
    shipping: {
      name: 'UAE Standard',
      countries: 'AE',
      baseRateMinorUnits: 1500,
      currencyCode: 'AED',
      perKgRateMinorUnits: 500,
      freeShippingThresholdMinorUnits: 15000,
      estimatedDaysMin: 1,
      estimatedDaysMax: 4,
      carriers: 'Aramex,DHL',
    },
  },
};

async function main() {
  const key = (process.argv[2] ?? 'EU').toUpperCase();
  const cfg = REGIONS[key];
  if (!cfg) {
    console.error(`Unsupported region key "${key}". Supported: ${Object.keys(REGIONS).join(', ')}`);
    process.exit(1);
  }

  const region = await prisma.region.upsert({
    where: { key },
    update: {
      name: cfg.name,
      languages: cfg.languages,
      defaultLanguage: cfg.defaultLanguage,
      currencies: cfg.currencies,
      defaultCurrency: cfg.defaultCurrency,
      defaultTimezone: cfg.defaultTimezone,
      enabled: true,
    },
    create: {
      key,
      name: cfg.name,
      languages: cfg.languages,
      defaultLanguage: cfg.defaultLanguage,
      currencies: cfg.currencies,
      defaultCurrency: cfg.defaultCurrency,
      defaultTimezone: cfg.defaultTimezone,
      enabled: true,
    },
  });
  console.log(`region ${region.key}: ${region.name} (${cfg.currencies}, ${cfg.defaultTimezone})`);

  const tax = await prisma.taxRule.findFirst({ where: { regionKey: key, name: cfg.tax.name } });
  if (tax) {
    await prisma.taxRule.update({ where: { id: tax.id }, data: { rate: cfg.tax.rate, type: cfg.tax.type } });
  } else {
    await prisma.taxRule.create({
      data: { regionKey: key, name: cfg.tax.name, rate: cfg.tax.rate, type: cfg.tax.type },
    });
  }
  console.log(`tax ${cfg.tax.name} @ ${cfg.tax.rate * 100}%`);

  const zone = await prisma.shippingZone.findFirst({ where: { regionKey: key, name: cfg.shipping.name } });
  if (zone) {
    await prisma.shippingZone.update({
      where: { id: zone.id },
      data: { ...cfg.shipping, currencyCode: cfg.shipping.currencyCode },
    });
  } else {
    await prisma.shippingZone.create({ data: { regionKey: key, ...cfg.shipping } });
  }
  console.log(`shipping ${cfg.shipping.name} base=${cfg.shipping.baseRateMinorUnits}${cfg.currencies}`);

  const slug = `storegrill-${key.toLowerCase()}`;
  let vendor = await prisma.vendorProfile.findFirst({ where: { slug } });
  if (!vendor) {
    const email = `house-${key.toLowerCase()}@storegrill.net`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: await bcrypt.hash(`house-${key}`, 12),
        name: `StoreGrill ${key}`,
        role: 'VENDOR',
        emailVerified: new Date(),
      },
    });
    vendor = await prisma.vendorProfile.create({
      data: {
        userId: user.id,
        storeName: `StoreGrill ${key}`,
        slug,
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        revenueSharePct: 0,
        warehouseRegionKey: key,
        isHouseVendor: true,
        autoPublishImports: true,
        trustTier: 'PREMIUM',
      },
    });
    console.log(`house vendor ${slug} created`);
  } else {
    console.log(`house vendor ${slug} already exists (${vendor.id})`);
  }
}

main()
  .catch(e => {
    console.error('Region bootstrap failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());