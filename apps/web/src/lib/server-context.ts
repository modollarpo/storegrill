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
  us: 'us', ca: 'us',
  ie: 'eu', de: 'eu', fr: 'eu', it: 'eu', es: 'eu', pt: 'eu', nl: 'eu',
  be: 'eu', lu: 'eu', at: 'eu', ch: 'eu', se: 'eu', no: 'eu', dk: 'eu',
  fi: 'eu', ee: 'eu', lv: 'eu', lt: 'eu', pl: 'eu', cz: 'eu', sk: 'eu',
  hu: 'eu', ro: 'eu', bg: 'eu', hr: 'eu', si: 'eu', gr: 'eu', cy: 'eu', mt: 'eu',
  ae: 'ae', sa: 'ae', qa: 'ae', kw: 'ae', bh: 'ae', om: 'ae', in: 'ae', au: 'ae', jp: 'ae',
  ng: 'ng', ke: 'ng', ug: 'ng', tz: 'ng',
  gh: 'gh', za: 'gh', eg: 'gh', ma: 'gh',
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
