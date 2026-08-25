export interface RegionLanguage {
  code: string;
  nativeName: string;
}

export interface RegionMeta {
  key: string;
  name: string;
  flag: string;
  currency: string;
  languages: RegionLanguage[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', de: 'Deutsch', fr: 'Français', nl: 'Nederlands',
  it: 'Italiano', es: 'Español', pt: 'Português', sv: 'Svenska',
  no: 'Norsk', da: 'Dansk', fi: 'Suomi', et: 'Eesti',
  lv: 'Latviešu', lt: 'Lietuvių', pl: 'Polski', cs: 'Čeština',
  sk: 'Slovenčina', hu: 'Magyar', ro: 'Română', bg: 'Български',
  hr: 'Hrvatski', sl: 'Slovenščina', el: 'Ελληνικά', mt: 'Malti',
  ja: '日本語', hi: 'हिन्दी', ar: 'العربية',
  sw: 'Kiswahili', af: 'Afrikaans', zu: 'isiZulu',
  ha: 'Hausa', yo: 'Yorùbá', ig: 'Igbo',
};

type RegionTuple = [key: string, name: string, flag: string, currency: string, languages: string[]];

const REGION_TUPLES: RegionTuple[] = [
  ['UK', 'United Kingdom', '🇬🇧', 'GBP', ['en']],
  ['US', 'United States', '🇺🇸', 'USD', ['en']],
  ['CA', 'Canada', '🇨🇦', 'CAD', ['en', 'fr']],
  ['IE', 'Ireland', '🇮🇪', 'EUR', ['en']],
  ['DE', 'Germany', '🇩🇪', 'EUR', ['de', 'en']],
  ['FR', 'France', '🇫🇷', 'EUR', ['fr', 'en']],
  ['IT', 'Italy', '🇮🇹', 'EUR', ['it', 'en']],
  ['ES', 'Spain', '🇪🇸', 'EUR', ['es', 'en']],
  ['PT', 'Portugal', '🇵🇹', 'EUR', ['pt', 'en']],
  ['NL', 'Netherlands', '🇳🇱', 'EUR', ['nl', 'en']],
  ['BE', 'Belgium', '🇧🇪', 'EUR', ['nl', 'fr', 'en']],
  ['LU', 'Luxembourg', '🇱🇺', 'EUR', ['fr', 'de', 'en']],
  ['AT', 'Austria', '🇦🇹', 'EUR', ['de', 'en']],
  ['CH', 'Switzerland', '🇨🇭', 'CHF', ['de', 'fr', 'it', 'en']],
  ['SE', 'Sweden', '🇸🇪', 'SEK', ['sv', 'en']],
  ['NO', 'Norway', '🇳🇴', 'NOK', ['no', 'en']],
  ['DK', 'Denmark', '🇩🇰', 'DKK', ['da', 'en']],
  ['FI', 'Finland', '🇫🇮', 'EUR', ['fi', 'sv', 'en']],
  ['EE', 'Estonia', '🇪🇪', 'EUR', ['et', 'en']],
  ['LV', 'Latvia', '🇱🇻', 'EUR', ['lv', 'en']],
  ['LT', 'Lithuania', '🇱🇹', 'EUR', ['lt', 'en']],
  ['PL', 'Poland', '🇵🇱', 'PLN', ['pl', 'en']],
  ['CZ', 'Czechia', '🇨🇿', 'CZK', ['cs', 'en']],
  ['SK', 'Slovakia', '🇸🇰', 'EUR', ['sk', 'en']],
  ['HU', 'Hungary', '🇭🇺', 'HUF', ['hu', 'en']],
  ['RO', 'Romania', '🇷🇴', 'RON', ['ro', 'en']],
  ['BG', 'Bulgaria', '🇧🇬', 'BGN', ['bg', 'en']],
  ['HR', 'Croatia', '🇭🇷', 'EUR', ['hr', 'en']],
  ['SI', 'Slovenia', '🇸🇮', 'EUR', ['sl', 'en']],
  ['GR', 'Greece', '🇬🇷', 'EUR', ['el', 'en']],
  ['CY', 'Cyprus', '🇨🇾', 'EUR', ['el', 'en']],
  ['MT', 'Malta', '🇲🇹', 'EUR', ['mt', 'en']],
  ['AU', 'Australia', '🇦🇺', 'AUD', ['en']],
  ['JP', 'Japan', '🇯🇵', 'JPY', ['ja', 'en']],
  ['IN', 'India', '🇮🇳', 'INR', ['en', 'hi']],
  ['AE', 'United Arab Emirates', '🇦🇪', 'AED', ['ar', 'en']],
  ['NG', 'Nigeria', '🇳🇬', 'NGN', ['en', 'ha', 'yo', 'ig']],
  ['GH', 'Ghana', '🇬🇭', 'GHS', ['en']],
  ['KE', 'Kenya', '🇰🇪', 'KES', ['en', 'sw']],
  ['UG', 'Uganda', '🇺🇬', 'UGX', ['en', 'sw']],
  ['ZA', 'South Africa', '🇿🇦', 'ZAR', ['en', 'af', 'zu']],
  ['EG', 'Egypt', '🇪🇬', 'EGP', ['ar', 'en']],
  ['MA', 'Morocco', '🇲🇦', 'MAD', ['ar', 'fr', 'en']],
  ['TZ', 'Tanzania', '🇹🇿', 'TZS', ['sw', 'en']],
];

export const REGION_META: RegionMeta[] = REGION_TUPLES.map(([key, name, flag, currency, languages]) => ({
  key,
  name,
  flag,
  currency,
  languages: languages.map(code => ({ code, nativeName: LANGUAGE_NAMES[code] || code })),
}));

export const DEFAULT_REGION_KEY = 'UK';

export const APEX_DOMAIN = process.env.NEXT_PUBLIC_APEX_DOMAIN || 'Storegrill.net';

export function regionByKey(key: string): RegionMeta {
  return REGION_META.find(r => r.key === key) || REGION_META[0];
}

export function regionSubdomain(key: string): string {
  return `${key.toLowerCase()}.${APEX_DOMAIN}`;
}

export function regionUrl(key: string, path: string = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `https://${regionSubdomain(key)}${cleanPath === '/' ? '/' : cleanPath}`;
}

export function languageNativeName(code: string): string {
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}
