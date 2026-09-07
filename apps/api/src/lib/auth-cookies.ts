import type { Response, CookieOptions } from 'express';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || (IS_PRODUCTION ? '.storegrill.net' : undefined);

export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function accessCookieOptions(isProduction?: boolean, cookieDomain?: string): CookieOptions {
  const prod = isProduction ?? IS_PRODUCTION;
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? ('none' as const) : ('lax' as const),
    domain: cookieDomain ?? COOKIE_DOMAIN,
    path: '/',
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
  };
}

export function refreshCookieOptions(isProduction?: boolean, cookieDomain?: string): CookieOptions {
  return {
    ...accessCookieOptions(isProduction, cookieDomain),
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('accessToken', accessToken, accessCookieOptions());
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
}

export function setAccessCookie(res: Response, accessToken: string): void {
  res.cookie('accessToken', accessToken, accessCookieOptions());
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', { domain: COOKIE_DOMAIN, path: '/' });
  res.clearCookie('refreshToken', { domain: COOKIE_DOMAIN, path: '/' });
}