import { DEFAULT_REGIONS } from '../models/region';

export interface DetectedLocale {
  regionKey: string;
  language: string;
  source: 'geo' | 'accept-language' | 'default';
}

interface AcceptLanguageTag {
  tag: string;
  base: string;
  q: number;
}

const COUNTRY_TO_REGION: Record<string, string> = {
  US: 'US', PR: 'US', GU: 'US', VI: 'US', AS: 'US', MP: 'US',
  CA: 'CA',
  GB: 'UK', JE: 'UK', GG: 'UK', IM: 'UK',
  IE: 'IE',
  DE: 'DE',
  FR: 'FR',
  IT: 'IT',
  ES: 'ES',
  PT: 'PT',
  NL: 'NL',
  BE: 'BE',
  LU: 'LU',
  AT: 'AT',
  CH: 'CH', LI: 'CH',
  SE: 'SE',
  NO: 'NO', SJ: 'NO',
  DK: 'DK', FO: 'DK', GL: 'DK',
  FI: 'FI', AX: 'FI',
  EE: 'EE',
  LV: 'LV',
  LT: 'LT',
  PL: 'PL',
  CZ: 'CZ',
  SK: 'SK',
  HU: 'HU',
  RO: 'RO', MD: 'RO',
  BG: 'BG',
  HR: 'HR',
  SI: 'SI',
  GR: 'GR',
  CY: 'CY',
  MT: 'MT',
  AU: 'AU', NZ: 'AU', CC: 'AU', CX: 'AU', NF: 'AU',
  JP: 'JP',
  IN: 'IN',
  AE: 'AE', SA: 'AE', QA: 'AE', KW: 'AE', BH: 'AE', OM: 'AE',
  NG: 'NG',
  GH: 'GH',
  KE: 'KE',
  UG: 'UG',
  ZA: 'ZA', NA: 'ZA', BW: 'ZA', LS: 'ZA', SZ: 'ZA',
  EG: 'EG',
  MA: 'MA', EH: 'MA',
  TZ: 'TZ',
};

const LANGUAGE_TO_REGION: Record<string, string> = {
  en: 'UK',
  fr: 'FR',
  de: 'DE',
  nl: 'NL',
  it: 'IT',
  es: 'ES',
  pt: 'PT',
  sv: 'SE',
  no: 'NO', nb: 'NO', nn: 'NO',
  da: 'DK',
  fi: 'FI',
  et: 'EE',
  lv: 'LV',
  lt: 'LT',
  pl: 'PL',
  cs: 'CZ',
  sk: 'SK',
  hu: 'HU',
  ro: 'RO',
  bg: 'BG',
  hr: 'HR',
  sl: 'SI',
  el: 'GR',
  mt: 'MT',
  ja: 'JP',
  hi: 'IN',
  ar: 'AE',
  sw: 'KE',
  af: 'ZA',
  zu: 'ZA',
  ha: 'NG',
  yo: 'NG',
  ig: 'NG',
};

export function parseAcceptLanguage(header: string | undefined | null): AcceptLanguageTag[] {
  if (!header) return [];
  return header
    .split(',')
    .map(part => {
      const trimmed = part.trim();
      const [tag, ...params] = trimmed.split(';');
      let q = 1;
      for (const param of params) {
        const [key, value] = param.trim().split('=');
        if (key === 'q') {
          const parsed = Number(value);
          q = Number.isFinite(parsed) ? parsed : 1;
        }
      }
      const cleanTag = (tag || '').trim().toLowerCase();
      return {
        tag: cleanTag,
        base: cleanTag.split('-')[0],
        q,
      };
    })
    .filter(t => t.tag.length > 0)
    .sort((a, b) => b.q - a.q);
}

function regionConfig(regionKey: string) {
  return DEFAULT_REGIONS.find(r => r.key === regionKey);
}

export function resolveRegionForCountry(countryCode: string | undefined | null): string | null {
  if (!countryCode) return null;
  return COUNTRY_TO_REGION[countryCode.toUpperCase()] || null;
}

export function detectRegionAndLanguage(
  acceptLanguageHeader: string | undefined | null,
  countryCode?: string | undefined | null
): DetectedLocale {
  const tags = parseAcceptLanguage(acceptLanguageHeader);

  let regionKey = resolveRegionForCountry(countryCode);
  let source: DetectedLocale['source'] = countryCode ? 'geo' : 'default';

  if (!regionKey) {
    for (const { tag, base } of tags) {
      const subtag = tag.includes('-') ? tag.split('-')[1] : undefined;
      const subtagRegion = subtag ? resolveRegionForCountry(subtag) : null;
      if (subtagRegion) {
        regionKey = subtagRegion;
        source = 'accept-language';
        break;
      }
      const candidate = LANGUAGE_TO_REGION[base];
      if (candidate) {
        regionKey = candidate;
        source = 'accept-language';
        break;
      }
    }
  }

  const resolvedRegionKey = regionKey || 'UK';
  const config = regionConfig(resolvedRegionKey);
  const supportedLanguages = config?.languages || ['en'];

  let language = config?.defaultLanguage || 'en';
  for (const { base } of tags) {
    if (supportedLanguages.includes(base)) {
      language = base;
      break;
    }
  }

  return { regionKey: resolvedRegionKey, language, source };
}

export function isValidPrefsCookie(raw: unknown): raw is { regionKey: string; language: string } {
  if (typeof raw !== 'object' || raw === null) return false;
  const prefs = raw as Record<string, unknown>;
  return (
    typeof prefs.regionKey === 'string' &&
    typeof prefs.language === 'string' &&
    Boolean(regionConfig(prefs.regionKey))
  );
}
