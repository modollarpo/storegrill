import { NextRequest, NextResponse } from 'next/server';
import { detectRegionAndLanguage, LAUNCH_REGION_KEYS } from '@Storegrill/shared';

const APEX_PATTERN = /^(?:https?:\/\/)?(?:www\.)?([a-z]{2})\.storegrill\.(?:net|com)(?::\d+)?$/i;
const APEX_ONLY_PATTERN = /^(?:https?:\/\/)?(?:www\.)?storegrill\.(?:net|com)(?::\d+)?$/i;

// Country subdomain → super-pod subdomain. Each Storegrill super-pod serves a
// group of countries; visiting a country subdomain redirects to its pod.
const POD_SUBDOMAINS = new Set(['uk', 'us', 'eu', 'ae', 'ng', 'gh']);

// Europe (except UK) → EU; Americas → US; UAE/Gulf + India/APAC → AE;
// Africa → NG (Nigeria + West/East Africa) and GH (Ghana + Southern/North Africa).
const COUNTRY_SUBDOMAIN_TO_POD: Record<string, string> = {
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

// Country → nearest pod for apex/`www`/`*` geo-routing.
const COUNTRY_TO_NEAREST_POD: Record<string, string> = {
  GB: 'uk', UK: 'uk',
  US: 'us', CA: 'us', PR: 'us', MX: 'us',
  IE: 'eu', DE: 'eu', FR: 'eu', IT: 'eu', ES: 'eu', PT: 'eu', NL: 'eu',
  BE: 'eu', LU: 'eu', AT: 'eu', CH: 'eu', SE: 'eu', NO: 'eu', DK: 'eu',
  FI: 'eu', EE: 'eu', LV: 'eu', LT: 'eu', PL: 'eu', CZ: 'eu', SK: 'eu',
  HU: 'eu', RO: 'eu', BG: 'eu', HR: 'eu', SI: 'eu', GR: 'eu', CY: 'eu', MT: 'eu',
  AE: 'ae', SA: 'ae', QA: 'ae', KW: 'ae', BH: 'ae', OM: 'ae', IN: 'ae', AU: 'ae', JP: 'ae', NZ: 'ae',
  NG: 'ng', KE: 'ng', UG: 'ng', TZ: 'ng',
  GH: 'gh', ZA: 'gh', EG: 'gh', MA: 'gh',
};

export function resolveCountrySubdomainPod(subdomain: string | null): string | null {
  if (!subdomain) return null;
  return COUNTRY_SUBDOMAIN_TO_POD[subdomain.toLowerCase()] ?? null;
}

export function resolveApexGeoPod(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_TO_NEAREST_POD[country.toUpperCase()] ?? null;
}

function hostToRegion(host: string | null): { subdomain: string | null; isApexOrWww: boolean } {
  if (!host) return { subdomain: null, isApexOrWww: false };
  const trimmed = host.trim();
  const apexMatch = APEX_ONLY_PATTERN.exec(trimmed);
  if (apexMatch) return { subdomain: null, isApexOrWww: true };
  const match = APEX_PATTERN.exec(trimmed);
  if (!match) return { subdomain: null, isApexOrWww: false };
  return { subdomain: match[1].toLowerCase(), isApexOrWww: false };
}

function geoCountry(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-azure-geo-country') ||
    undefined
  );
}

export const middleware = (request: NextRequest): NextResponse => {
  const { subdomain, isApexOrWww } = hostToRegion(request.headers.get('host'));

  // Country subdomain → redirect to its super-pod.
  const countryPod = resolveCountrySubdomainPod(subdomain);
  if (subdomain && !POD_SUBDOMAINS.has(subdomain) && countryPod) {
    const url = request.nextUrl.clone();
    url.port = '';
    url.host = `${countryPod}.storegrill.net`;
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();

  if (!request.cookies.has('sg_prefs')) {
    const hostRegion = subdomain ? subdomain.toUpperCase() : null;
    if (hostRegion && LAUNCH_REGION_KEYS.includes(hostRegion)) {
      response.cookies.set('sg_prefs', JSON.stringify({ regionKey: hostRegion, language: '' }), {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
      });
    } else {
      const country = geoCountry(request);

      // Apex/`www`/wildcard: route to nearest healthy pod by geo.
      const apexPod = resolveApexGeoPod(country);
      if (isApexOrWww && apexPod) {
        const url = request.nextUrl.clone();
        url.port = '';
        url.host = `${apexPod}.storegrill.net`;
        return NextResponse.redirect(url, 307);
      }

      const detected = detectRegionAndLanguage(request.headers.get('accept-language'), country);

      response.cookies.set('sg_prefs', JSON.stringify({ regionKey: detected.regionKey, language: detected.language }), {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
      });
    }
  }

  return response;
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|banners|api).*)'],
};
