import { z } from 'zod';

export const PAYMENT_PROVIDERS = ['stripe', 'paypal', 'cod'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_METHODS = [
  'card',
  'paypal',
  'klarna',
  'afterpay',
  'sepa_debit',
  'ideal',
  'bancontact',
  'bizum',
  'mbway',
  'multibanco',
  'blik',
  'przelewy24',
  'mobilepay',
  'swish',
  'twint',
  'konbini',
  'cod',
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_PROVIDER: Record<PaymentMethodId, PaymentProvider> = {
  card: 'stripe',
  paypal: 'paypal',
  klarna: 'stripe',
  afterpay: 'stripe',
  sepa_debit: 'stripe',
  ideal: 'stripe',
  bancontact: 'stripe',
  bizum: 'stripe',
  mbway: 'stripe',
  multibanco: 'stripe',
  blik: 'stripe',
  przelewy24: 'stripe',
  mobilepay: 'stripe',
  swish: 'stripe',
  twint: 'stripe',
  konbini: 'stripe',
  cod: 'cod',
};

export function providerFor(method: string): PaymentProvider {
  return PAYMENT_METHOD_PROVIDER[method as PaymentMethodId] || 'stripe';
}

export function paymentMethodLabel(method: PaymentMethodId): string {
  const labels: Record<PaymentMethodId, string> = {
    card: 'Credit / Debit Card',
    paypal: 'PayPal',
    klarna: 'Klarna — Pay later',
    afterpay: 'Afterpay / Clearpay',
    sepa_debit: 'SEPA Direct Debit',
    ideal: 'iDEAL',
    bancontact: 'Bancontact',
    bizum: 'Bizum',
    mbway: 'MB WAY',
    multibanco: 'Multibanco',
    blik: 'BLIK',
    przelewy24: 'Przelewy24',
    mobilepay: 'MobilePay',
    swish: 'Swish',
    twint: 'TWINT',
    konbini: 'Konbini (store payment)',
    cod: 'Cash on Delivery',
  };
  return labels[method];
}

export const RegionSchema = z.object({
  id: z.string(),
  key: z.string().min(2).max(10),
  name: z.string(),
  languages: z.array(z.string()).min(1),
  defaultLanguage: z.string(),
  currencies: z.array(z.string()).min(1),
  defaultCurrency: z.string().min(3).max(3),
  defaultTimezone: z.string(),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).default(['card', 'paypal']),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const RegionConfigSchema = z.object({
  key: z.string(),
  name: z.string(),
  languages: z.array(z.string()),
  defaultLanguage: z.string(),
  currencies: z.array(z.string()),
  defaultCurrency: z.string(),
  defaultTimezone: z.string(),
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).default(['card', 'paypal']),
  taxRules: z.array(z.object({
    name: z.string(),
    rate: z.number().min(0).max(1),
    type: z.enum(['VAT', 'GST', 'SALES_TAX', 'IMPORT_DUTY']),
    categoryId: z.string().optional(),
  })).default([]),
  shippingZones: z.array(z.object({
    name: z.string(),
    countries: z.array(z.string()),
    baseRateMinorUnits: z.number(),
    currencyCode: z.string(),
    perKgRateMinorUnits: z.number().optional(),
    freeShippingThresholdMinorUnits: z.number().optional(),
    estimatedDaysMin: z.number().optional(),
    estimatedDaysMax: z.number().optional(),
    carriers: z.array(z.string()).default(['standard']),
  })).default([]),
  freeShippingThresholdMinorUnits: z.number().default(5000),
});

export type Region = z.infer<typeof RegionSchema>;
export type RegionConfig = z.infer<typeof RegionConfigSchema>;

interface RegionSeed {
  key: string;
  name: string;
  languages: [string, ...string[]];
  currency: string;
  timezone: string;
  taxName: string;
  taxRate: number;
  taxType: 'VAT' | 'GST' | 'SALES_TAX';
  shipCountries: string[];
  baseRateMinorUnits: number;
  perKgRateMinorUnits?: number;
  thresholdMinorUnits: number;
  daysMin: number;
  daysMax: number;
  carriers: string[];
  paymentMethods: PaymentMethodId[];
}

const EUR = 'EUR';

const REGION_SEEDS: RegionSeed[] = [
  { key: 'UK', name: 'United Kingdom', languages: ['en'], currency: 'GBP', timezone: 'Europe/London', taxName: 'VAT', taxRate: 0.20, taxType: 'VAT', shipCountries: ['GB'], baseRateMinorUnits: 399, perKgRateMinorUnits: 99, thresholdMinorUnits: 3500, daysMin: 1, daysMax: 4, carriers: ['Royal Mail', 'Evri', 'DHL'], paymentMethods: ['card', 'paypal', 'klarna', 'afterpay'] },
  { key: 'US', name: 'United States', languages: ['en'], currency: 'USD', timezone: 'America/New_York', taxName: 'Sales Tax', taxRate: 0.0825, taxType: 'SALES_TAX', shipCountries: ['US'], baseRateMinorUnits: 599, perKgRateMinorUnits: 100, thresholdMinorUnits: 3500, daysMin: 3, daysMax: 7, carriers: ['UPS', 'FedEx', 'USPS'], paymentMethods: ['card', 'paypal', 'klarna'] },
  { key: 'CA', name: 'Canada', languages: ['en', 'fr'], currency: 'CAD', timezone: 'America/Toronto', taxName: 'GST/HST', taxRate: 0.05, taxType: 'SALES_TAX', shipCountries: ['CA'], baseRateMinorUnits: 799, perKgRateMinorUnits: 150, thresholdMinorUnits: 5500, daysMin: 2, daysMax: 8, carriers: ['Canada Post', 'Purolator', 'UPS'], paymentMethods: ['card', 'paypal', 'klarna'] },
  { key: 'IE', name: 'Ireland', languages: ['en'], currency: EUR, timezone: 'Europe/Dublin', taxName: 'VAT', taxRate: 0.23, taxType: 'VAT', shipCountries: ['IE'], baseRateMinorUnits: 595, perKgRateMinorUnits: 130, thresholdMinorUnits: 4500, daysMin: 2, daysMax: 5, carriers: ['An Post', 'DHL', 'DPD'], paymentMethods: ['card', 'paypal', 'klarna'] },
  { key: 'DE', name: 'Germany', languages: ['de', 'en'], currency: EUR, timezone: 'Europe/Berlin', taxName: 'MwSt.', taxRate: 0.19, taxType: 'VAT', shipCountries: ['DE', 'AT', 'CH'], baseRateMinorUnits: 499, perKgRateMinorUnits: 120, thresholdMinorUnits: 4000, daysMin: 1, daysMax: 4, carriers: ['DHL', 'DPD', 'GLS'], paymentMethods: ['card', 'paypal', 'sepa_debit', 'klarna'] },
  { key: 'FR', name: 'France', languages: ['fr', 'en'], currency: EUR, timezone: 'Europe/Paris', taxName: 'TVA', taxRate: 0.20, taxType: 'VAT', shipCountries: ['FR', 'MC'], baseRateMinorUnits: 449, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 5, carriers: ['Colissimo', 'Mondial Relay', 'DHL'], paymentMethods: ['card', 'paypal', 'klarna'] },
  { key: 'IT', name: 'Italy', languages: ['it', 'en'], currency: EUR, timezone: 'Europe/Rome', taxName: 'IVA', taxRate: 0.22, taxType: 'VAT', shipCountries: ['IT', 'SM', 'VA'], baseRateMinorUnits: 490, perKgRateMinorUnits: 120, thresholdMinorUnits: 4500, daysMin: 2, daysMax: 6, carriers: ['BRT', 'Poste Italiane', 'GLS'], paymentMethods: ['card', 'paypal', 'cod', 'klarna'] },
  { key: 'ES', name: 'Spain', languages: ['es', 'en'], currency: EUR, timezone: 'Europe/Madrid', taxName: 'IVA', taxRate: 0.21, taxType: 'VAT', shipCountries: ['ES', 'AD'], baseRateMinorUnits: 449, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 6, carriers: ['Correos', 'SEUR', 'MRW'], paymentMethods: ['card', 'paypal', 'bizum', 'cod'] },
  { key: 'PT', name: 'Portugal', languages: ['pt', 'en'], currency: EUR, timezone: 'Europe/Lisbon', taxName: 'IVA', taxRate: 0.23, taxType: 'VAT', shipCountries: ['PT'], baseRateMinorUnits: 459, perKgRateMinorUnits: 115, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 6, carriers: ['CTT', 'DPD PT', 'DHL'], paymentMethods: ['card', 'paypal', 'mbway', 'multibanco'] },
  { key: 'NL', name: 'Netherlands', languages: ['nl', 'en'], currency: EUR, timezone: 'Europe/Amsterdam', taxName: 'BTW', taxRate: 0.21, taxType: 'VAT', shipCountries: ['NL'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 3500, daysMin: 1, daysMax: 3, carriers: ['PostNL', 'DHL', 'DPD'], paymentMethods: ['ideal', 'card', 'paypal'] },
  { key: 'BE', name: 'Belgium', languages: ['nl', 'fr', 'en'], currency: EUR, timezone: 'Europe/Brussels', taxName: 'BTW/TVA', taxRate: 0.21, taxType: 'VAT', shipCountries: ['BE'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 1, daysMax: 3, carriers: ['bpost', 'DPD BE', 'DHL'], paymentMethods: ['bancontact', 'card', 'paypal'] },
  { key: 'LU', name: 'Luxembourg', languages: ['fr', 'de', 'en'], currency: EUR, timezone: 'Europe/Luxembourg', taxName: 'TVA', taxRate: 0.17, taxType: 'VAT', shipCountries: ['LU'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 4, carriers: ['Post Luxembourg', 'DHL', 'DPD'], paymentMethods: ['card', 'paypal', 'sepa_debit'] },
  { key: 'AT', name: 'Austria', languages: ['de', 'en'], currency: EUR, timezone: 'Europe/Vienna', taxName: 'USt.', taxRate: 0.20, taxType: 'VAT', shipCountries: ['AT'], baseRateMinorUnits: 499, perKgRateMinorUnits: 120, thresholdMinorUnits: 4000, daysMin: 1, daysMax: 4, carriers: ['Post AT', 'DHL AT', 'DPD AT'], paymentMethods: ['card', 'paypal', 'sepa_debit', 'klarna'] },
  { key: 'CH', name: 'Switzerland', languages: ['de', 'fr', 'it', 'en'], currency: 'CHF', timezone: 'Europe/Zurich', taxName: 'MWST', taxRate: 0.081, taxType: 'VAT', shipCountries: ['CH', 'LI'], baseRateMinorUnits: 700, perKgRateMinorUnits: 150, thresholdMinorUnits: 5000, daysMin: 2, daysMax: 5, carriers: ['Swiss Post', 'Planzer', 'DHL'], paymentMethods: ['twint', 'card', 'paypal'] },
  { key: 'SE', name: 'Sweden', languages: ['sv', 'en'], currency: 'SEK', timezone: 'Europe/Stockholm', taxName: 'Moms', taxRate: 0.25, taxType: 'VAT', shipCountries: ['SE'], baseRateMinorUnits: 4900, perKgRateMinorUnits: 1100, thresholdMinorUnits: 40000, daysMin: 2, daysMax: 5, carriers: ['PostNord', 'Budbee', 'DHL'], paymentMethods: ['swish', 'klarna', 'card', 'paypal'] },
  { key: 'NO', name: 'Norway', languages: ['no', 'en'], currency: 'NOK', timezone: 'Europe/Oslo', taxName: 'MVA', taxRate: 0.25, taxType: 'VAT', shipCountries: ['NO'], baseRateMinorUnits: 5900, perKgRateMinorUnits: 1300, thresholdMinorUnits: 50000, daysMin: 2, daysMax: 6, carriers: ['Posten Bring', 'Helthjem', 'DHL'], paymentMethods: ['card', 'paypal', 'klarna'] },
  { key: 'DK', name: 'Denmark', languages: ['da', 'en'], currency: 'DKK', timezone: 'Europe/Copenhagen', taxName: 'Moms', taxRate: 0.25, taxType: 'VAT', shipCountries: ['DK'], baseRateMinorUnits: 3900, perKgRateMinorUnits: 900, thresholdMinorUnits: 30000, daysMin: 1, daysMax: 4, carriers: ['PostNord DK', 'GLS DK', 'dao'], paymentMethods: ['mobilepay', 'card', 'paypal'] },
  { key: 'FI', name: 'Finland', languages: ['fi', 'sv', 'en'], currency: EUR, timezone: 'Europe/Helsinki', taxName: 'ALV', taxRate: 0.255, taxType: 'VAT', shipCountries: ['FI'], baseRateMinorUnits: 490, perKgRateMinorUnits: 120, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 5, carriers: ['Posti', 'Matkahuolto', 'DHL'], paymentMethods: ['card', 'paypal', 'klarna'] },
  { key: 'EE', name: 'Estonia', languages: ['et', 'en'], currency: EUR, timezone: 'Europe/Tallinn', taxName: 'KM', taxRate: 0.24, taxType: 'VAT', shipCountries: ['EE'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 5, carriers: ['Omniva', 'DPD EE', 'Venipak'], paymentMethods: ['card', 'paypal'] },
  { key: 'LV', name: 'Latvia', languages: ['lv', 'en'], currency: EUR, timezone: 'Europe/Riga', taxName: 'PVN', taxRate: 0.21, taxType: 'VAT', shipCountries: ['LV'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 5, carriers: ['Omniva LV', 'DPD LV', 'Venipak'], paymentMethods: ['card', 'paypal'] },
  { key: 'LT', name: 'Lithuania', languages: ['lt', 'en'], currency: EUR, timezone: 'Europe/Vilnius', taxName: 'PVM', taxRate: 0.21, taxType: 'VAT', shipCountries: ['LT'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 5, carriers: ['LP Express', 'Venipak', 'DPD LT'], paymentMethods: ['card', 'paypal'] },
  { key: 'PL', name: 'Poland', languages: ['pl', 'en'], currency: 'PLN', timezone: 'Europe/Warsaw', taxName: 'VAT', taxRate: 0.23, taxType: 'VAT', shipCountries: ['PL'], baseRateMinorUnits: 1999, perKgRateMinorUnits: 450, thresholdMinorUnits: 19900, daysMin: 1, daysMax: 4, carriers: ['InPost', 'DPD PL', 'Orlen Paczka'], paymentMethods: ['blik', 'przelewy24', 'card', 'cod'] },
  { key: 'CZ', name: 'Czechia', languages: ['cs', 'en'], currency: 'CZK', timezone: 'Europe/Prague', taxName: 'DPH', taxRate: 0.21, taxType: 'VAT', shipCountries: ['CZ'], baseRateMinorUnits: 11900, perKgRateMinorUnits: 2800, thresholdMinorUnits: 99900, daysMin: 1, daysMax: 4, carriers: ['Ceska Posta', 'Zasilkovna', 'PPL'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'SK', name: 'Slovakia', languages: ['sk', 'en'], currency: EUR, timezone: 'Europe/Bratislava', taxName: 'DPH', taxRate: 0.23, taxType: 'VAT', shipCountries: ['SK'], baseRateMinorUnits: 490, perKgRateMinorUnits: 120, thresholdMinorUnits: 4500, daysMin: 1, daysMax: 4, carriers: ['Slovenska Posta', 'Packeta', 'DPD SK'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'HU', name: 'Hungary', languages: ['hu', 'en'], currency: 'HUF', timezone: 'Europe/Budapest', taxName: 'AFA', taxRate: 0.27, taxType: 'VAT', shipCountries: ['HU'], baseRateMinorUnits: 19900, perKgRateMinorUnits: 4500, thresholdMinorUnits: 159900, daysMin: 1, daysMax: 4, carriers: ['Magyar Posta', 'Foxpost', 'GLS HU'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'RO', name: 'Romania', languages: ['ro', 'en'], currency: 'RON', timezone: 'Europe/Bucharest', taxName: 'TVA', taxRate: 0.21, taxType: 'VAT', shipCountries: ['RO'], baseRateMinorUnits: 2499, perKgRateMinorUnits: 550, thresholdMinorUnits: 19900, daysMin: 1, daysMax: 4, carriers: ['Fan Courier', 'Cargus', 'Sameday'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'BG', name: 'Bulgaria', languages: ['bg', 'en'], currency: 'BGN', timezone: 'Europe/Sofia', taxName: 'DDS', taxRate: 0.20, taxType: 'VAT', shipCountries: ['BG'], baseRateMinorUnits: 990, perKgRateMinorUnits: 220, thresholdMinorUnits: 7900, daysMin: 1, daysMax: 4, carriers: ['Econt', 'Speedy', 'DHL BG'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'HR', name: 'Croatia', languages: ['hr', 'en'], currency: EUR, timezone: 'Europe/Zagreb', taxName: 'PDV', taxRate: 0.25, taxType: 'VAT', shipCountries: ['HR'], baseRateMinorUnits: 490, perKgRateMinorUnits: 120, thresholdMinorUnits: 4500, daysMin: 2, daysMax: 5, carriers: ['HP Express', 'Overseas', 'DPD HR'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'SI', name: 'Slovenia', languages: ['sl', 'en'], currency: EUR, timezone: 'Europe/Ljubljana', taxName: 'DDV', taxRate: 0.22, taxType: 'VAT', shipCountries: ['SI'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 1, daysMax: 4, carriers: ['Posta Slovenije', 'GLS SI', 'Intercity'], paymentMethods: ['card', 'paypal'] },
  { key: 'GR', name: 'Greece', languages: ['el', 'en'], currency: EUR, timezone: 'Europe/Athens', taxName: 'FPA', taxRate: 0.24, taxType: 'VAT', shipCountries: ['GR'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 6, carriers: ['ELTA', 'ACS', 'Geniki Tachydromiki'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'CY', name: 'Cyprus', languages: ['el', 'en'], currency: EUR, timezone: 'Asia/Nicosia', taxName: 'FPA', taxRate: 0.19, taxType: 'VAT', shipCountries: ['CY'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 6, carriers: ['Cyprus Post', 'ACS', 'Skynet'], paymentMethods: ['card', 'paypal'] },
  { key: 'MT', name: 'Malta', languages: ['mt', 'en'], currency: EUR, timezone: 'Europe/Malta', taxName: 'VAT', taxRate: 0.18, taxType: 'VAT', shipCountries: ['MT'], baseRateMinorUnits: 450, perKgRateMinorUnits: 110, thresholdMinorUnits: 4000, daysMin: 2, daysMax: 6, carriers: ['MaltaPost', 'DHL MT'], paymentMethods: ['card', 'paypal'] },
  { key: 'AU', name: 'Australia', languages: ['en'], currency: 'AUD', timezone: 'Australia/Sydney', taxName: 'GST', taxRate: 0.10, taxType: 'SALES_TAX', shipCountries: ['AU', 'NZ'], baseRateMinorUnits: 699, perKgRateMinorUnits: 180, thresholdMinorUnits: 4900, daysMin: 2, daysMax: 9, carriers: ['Australia Post', 'StarTrack'], paymentMethods: ['card', 'paypal', 'afterpay'] },
  { key: 'JP', name: 'Japan', languages: ['ja', 'en'], currency: 'JPY', timezone: 'Asia/Tokyo', taxName: 'Consumption Tax', taxRate: 0.10, taxType: 'SALES_TAX', shipCountries: ['JP'], baseRateMinorUnits: 600, perKgRateMinorUnits: 120, thresholdMinorUnits: 5000, daysMin: 1, daysMax: 5, carriers: ['Yamato', 'Japan Post', 'Sagawa'], paymentMethods: ['card', 'konbini', 'cod'] },
  { key: 'IN', name: 'India', languages: ['en', 'hi'], currency: 'INR', timezone: 'Asia/Kolkata', taxName: 'GST', taxRate: 0.18, taxType: 'SALES_TAX', shipCountries: ['IN'], baseRateMinorUnits: 4900, perKgRateMinorUnits: 1200, thresholdMinorUnits: 49900, daysMin: 3, daysMax: 8, carriers: ['Delhivery', 'BlueDart', 'India Post'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'AE', name: 'United Arab Emirates', languages: ['ar', 'en'], currency: 'AED', timezone: 'Asia/Dubai', taxName: 'VAT', taxRate: 0.05, taxType: 'VAT', shipCountries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'], baseRateMinorUnits: 1500, perKgRateMinorUnits: 400, thresholdMinorUnits: 10000, daysMin: 1, daysMax: 4, carriers: ['Aramex', 'Emirates Post', 'DHL'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'NG', name: 'Nigeria', languages: ['en', 'ha', 'yo', 'ig'], currency: 'NGN', timezone: 'Africa/Lagos', taxName: 'VAT', taxRate: 0.075, taxType: 'VAT', shipCountries: ['NG'], baseRateMinorUnits: 150000, perKgRateMinorUnits: 40000, thresholdMinorUnits: 2500000, daysMin: 2, daysMax: 7, carriers: ['GIG Logistics', 'Red Star Express', 'DHL'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'GH', name: 'Ghana', languages: ['en'], currency: 'GHS', timezone: 'Africa/Accra', taxName: 'VAT', taxRate: 0.15, taxType: 'VAT', shipCountries: ['GH'], baseRateMinorUnits: 3000, perKgRateMinorUnits: 800, thresholdMinorUnits: 20000, daysMin: 2, daysMax: 6, carriers: ['Ghana Post', 'Speedaf', 'DHL'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'KE', name: 'Kenya', languages: ['en', 'sw'], currency: 'KES', timezone: 'Africa/Nairobi', taxName: 'VAT', taxRate: 0.16, taxType: 'VAT', shipCountries: ['KE'], baseRateMinorUnits: 30000, perKgRateMinorUnits: 8000, thresholdMinorUnits: 250000, daysMin: 1, daysMax: 5, carriers: ['Sendy', 'G4S Courier', 'DHL'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'UG', name: 'Uganda', languages: ['en', 'sw'], currency: 'UGX', timezone: 'Africa/Kampala', taxName: 'VAT', taxRate: 0.18, taxType: 'VAT', shipCountries: ['UG'], baseRateMinorUnits: 15000, perKgRateMinorUnits: 4000, thresholdMinorUnits: 100000, daysMin: 2, daysMax: 6, carriers: ['Posta Uganda', 'G4S Courier', 'DHL'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'ZA', name: 'South Africa', languages: ['en', 'af', 'zu'], currency: 'ZAR', timezone: 'Africa/Johannesburg', taxName: 'VAT', taxRate: 0.15, taxType: 'VAT', shipCountries: ['ZA', 'NA', 'BW', 'LS', 'SZ'], baseRateMinorUnits: 6000, perKgRateMinorUnits: 1500, thresholdMinorUnits: 45000, daysMin: 1, daysMax: 4, carriers: ['The Courier Guy', 'Postnet', 'DHL'], paymentMethods: ['card', 'paypal', 'afterpay'] },
  { key: 'EG', name: 'Egypt', languages: ['ar', 'en'], currency: 'EGP', timezone: 'Africa/Cairo', taxName: 'VAT', taxRate: 0.14, taxType: 'VAT', shipCountries: ['EG'], baseRateMinorUnits: 5000, perKgRateMinorUnits: 1200, thresholdMinorUnits: 40000, daysMin: 2, daysMax: 6, carriers: ['Aramex', 'Bosta', 'Egypt Post'], paymentMethods: ['card', 'paypal', 'cod'] },
  { key: 'MA', name: 'Morocco', languages: ['ar', 'fr', 'en'], currency: 'MAD', timezone: 'Africa/Casablanca', taxName: 'TVA', taxRate: 0.20, taxType: 'VAT', shipCountries: ['MA', 'EH'], baseRateMinorUnits: 3500, perKgRateMinorUnits: 900, thresholdMinorUnits: 30000, daysMin: 2, daysMax: 6, carriers: ['Amana', 'CTM Messagerie', 'DHL'], paymentMethods: ['card', 'paypal'] },
  { key: 'TZ', name: 'Tanzania', languages: ['sw', 'en'], currency: 'TZS', timezone: 'Africa/Dar_es_Salaam', taxName: 'VAT', taxRate: 0.18, taxType: 'VAT', shipCountries: ['TZ'], baseRateMinorUnits: 7000, perKgRateMinorUnits: 1800, thresholdMinorUnits: 60000, daysMin: 2, daysMax: 7, carriers: ['Posta Tanzania', 'DHL', 'Speedaf'], paymentMethods: ['card', 'paypal', 'cod'] },
];

function buildRegionConfig(seed: RegionSeed): RegionConfig {
  return {
    key: seed.key,
    name: seed.name,
    languages: seed.languages,
    defaultLanguage: seed.languages[0],
    currencies: [seed.currency],
    defaultCurrency: seed.currency,
    defaultTimezone: seed.timezone,
    paymentMethods: seed.paymentMethods,
    taxRules: [{ name: seed.taxName, rate: seed.taxRate, type: seed.taxType }],
    shippingZones: [{
      name: `${seed.name} Standard`,
      countries: seed.shipCountries,
      baseRateMinorUnits: seed.baseRateMinorUnits,
      currencyCode: seed.currency,
      perKgRateMinorUnits: seed.perKgRateMinorUnits,
      freeShippingThresholdMinorUnits: seed.thresholdMinorUnits,
      estimatedDaysMin: seed.daysMin,
      estimatedDaysMax: seed.daysMax,
      carriers: seed.carriers,
    }],
    freeShippingThresholdMinorUnits: seed.thresholdMinorUnits,
  };
}

export const DEFAULT_REGIONS: RegionConfig[] = REGION_SEEDS.map(buildRegionConfig);

export const LAUNCH_REGION_KEYS: string[] = REGION_SEEDS.map(s => s.key);
