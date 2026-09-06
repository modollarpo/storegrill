import { cookies, headers } from 'next/headers';
import { detectRegionAndLanguage } from '@Storegrill/shared';
import { DEFAULT_REGION_KEY, REGION_META, regionByKey } from './regions';

export interface RequestContext {
  regionKey: string;
  language: string;
}

function isValidRegion(key: string): boolean {
  return REGION_META.some(r => r.key === key);
}

// Mapping of country-style subdomains to region keys (mirrors the middleware logic)
const SUBDOMAIN_TO_REGION: Record<string, string> = {
  uk: 'UK', gb: 'UK',
  us: 'US', ca: 'CA',
  ie: 'IE', de: 'DE', fr: 'FR', it: 'IT', es: 'ES', pt: 'PT', nl: 'NL',
  be: 'BE', lu: 'LU', at: 'AT', ch: 'CH', se: 'SE', no: 'NO', dk: 'DK',
  fi: 'FI', ee: 'EE', lv: 'LV', lt: 'LT', pl: 'PL', cz: 'CZ', sk: 'SK',
  hu: 'HU', ro: 'RO', bg: 'BG', hr: 'HR', si: 'SI', gr: 'GR', cy: 'CY', mt: 'MT',
  ae: 'AE', in: 'IN', au: 'AU', jp: 'JP',
  ng: 'NG', ke: 'KE', ug: 'UG', tz: 'TZ',
  gh: 'GH', za: 'ZA', eg: 'EG', ma: 'MA',
};

export function resolveRegionFromHost(hostHeader: string): string | null {
  const subdomainMatch = hostHeader.match(/^([a-z0-9-]+)\.storegrill\.net$/i);
  if (!subdomainMatch) return null;
  const regionKey = SUBDOMAIN_TO_REGION[subdomainMatch[1].toLowerCase()];
  return regionKey && isValidRegion(regionKey) ? regionKey : null;
}

export async function getRequestContext(): Promise<RequestContext> {
  const cookieStore = cookies();
  const raw = cookieStore.get('sg_prefs')?.value;

  if (raw) {
    try {
      const prefs = JSON.parse(raw) as { regionKey?: string; language?: string };
      if (prefs.regionKey && isValidRegion(prefs.regionKey)) {
        const region = regionByKey(prefs.regionKey);
        const language =
          prefs.language && region.languages.some(l => l.code === prefs.language)
            ? prefs.language
            : region.languages[0].code;
        return { regionKey: prefs.regionKey, language };
      }
    } catch {
      // fall through to detection
    }
  }

  const headerStore = headers();
  const country =
    headerStore.get('x-vercel-ip-country') ||
    headerStore.get('cf-ipcountry') ||
    headerStore.get('x-azure-geo-country') ||
    undefined;
  const detected = detectRegionAndLanguage(headerStore.get('accept-language'), country);

  // If detection didn't yield a valid region, try the hostname subdomain
  const resolvedRegionKey = resolveRegionFromHost(headerStore.get('host') || '');
  if (resolvedRegionKey) {
    const region = regionByKey(resolvedRegionKey);
    return { regionKey: resolvedRegionKey, language: region.languages[0].code };
  }

  return {
    regionKey: isValidRegion(detected.regionKey) ? detected.regionKey : DEFAULT_REGION_KEY,
    language: detected.language,
  };
}
