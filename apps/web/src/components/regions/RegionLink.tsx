'use client';

import { type MouseEvent, type PropsWithChildren } from 'react';

interface RegionLinkProps extends PropsWithChildren {
  regionKey: string;
  href: string;
  hrefLang?: string;
  className?: string;
  ariaCurrent?: 'page';
}

const COUNTRY_COOKIE = 'sg_country';

export function RegionLink({ regionKey, href, hrefLang, className, ariaCurrent, children }: RegionLinkProps) {
  function selectCountry(_e: MouseEvent<HTMLAnchorElement>) {
    // Saved across all *.storegrill.net pods before the country subdomain
    // redirects to its super-pod, so the choice survives the 308 hop.
    document.cookie = `${COUNTRY_COOKIE}=${regionKey}; domain=.storegrill.net; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <a href={href} hrefLang={hrefLang} aria-current={ariaCurrent} className={className} onClick={selectCountry}>
      {children}
    </a>
  );
}