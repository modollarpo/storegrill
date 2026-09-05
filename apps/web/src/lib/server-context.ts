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
  uk: 'uk', gb: 'uk',
  us: 'us', ca: 'ca',
  ie: 'ie', de: 'de', fr: 'fr', it: 'it', es: 'es', pt: 'pt', nl: 'nl',
  be: 'be', lu: 'lu', at: 'at', ch: 'ch', se: 'se', no: 'no', dk: 'dk',
  fi: 'fi', ee: 'ee', lv: 'lv', lt: 'lt', pl: 'pl', cz: 'cz', sk: 'sk',
  hu: 'hu', ro: 'ro', bg: 'bg', hr: 'hr', si: 'si', gr: 'gr', cy: 'cy', mt: 'mt',
  ae: 'ae', in: 'in', au: 'au', jp: 'jp',
  ng: 'ng', ke: 'ke', ug: 'ug', tz: 'tz',
  gh: 'gh', za: 'za', eg: 'eg', ma: 'ma',
};

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
  const hostHeader = headerStore.get('host') || '';
  const subdomainMatch = hostHeader.match(/^([a-z0-9-]+)\.storegrill\.net$/i);
  if (subdomainMatch) {
    const subdomainKey = subdomainMatch[1].toUpperCase();
    if (SUBDOMAIN_TO_REGION[subdomainKey]) {
      const regionKey = SUBDOMAIN_TO_REGION[subdomainKey];
      const region = regionByKey(regionKey);
      return { regionKey, language: region.languages[0].code };
    }
  }

  return {
    regionKey: isValidRegion(detected.regionKey) ? detected.regionKey : DEFAULT_REGION_KEY,
    language: detected.language,
  };
}
