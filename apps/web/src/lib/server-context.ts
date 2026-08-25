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

  return {
    regionKey: isValidRegion(detected.regionKey) ? detected.regionKey : DEFAULT_REGION_KEY,
    language: detected.language,
  };
}
