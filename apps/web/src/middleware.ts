import { NextRequest, NextResponse } from 'next/server';
import { detectRegionAndLanguage, LAUNCH_REGION_KEYS } from '@Storegrill/shared';

const APEX_PATTERN = /^(?:https?:\/\/)?(?:www\.)?([a-z]{2})\.storegrill\.(?:net|com)(?::\d+)?$/i;

function regionFromHost(host: string | null): string | null {
  if (!host) return null;
  const match = APEX_PATTERN.exec(host.trim());
  if (!match) return null;
  const key = match[1].toUpperCase();
  return LAUNCH_REGION_KEYS.includes(key) ? key : null;
}

export const middleware = (request: NextRequest): NextResponse => {
  const response = NextResponse.next();

  if (!request.cookies.has('sg_prefs')) {
    const hostRegion = regionFromHost(request.headers.get('host'));
    if (hostRegion) {
      response.cookies.set('sg_prefs', JSON.stringify({ regionKey: hostRegion, language: '' }), {
        path: '/',
        maxAge: 31536000,
        sameSite: 'lax',
      });
    } else {
      const country =
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-azure-geo-country') ||
        undefined;

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
