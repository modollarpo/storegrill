import { describe, expect, it } from 'vitest';
import { detectRegionAndLanguage, parseAcceptLanguage } from '@Storegrill/shared';
import { resolveCountrySubdomainPod, resolveApexGeoPod } from './middleware';

describe('web middleware region detection contract', () => {
  it('detects German visitor without geo header', () => {
    const result = detectRegionAndLanguage('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7');
    expect(result.regionKey).toBe('DE');
    expect(result.language).toBe('de');
  });

  it('detects Japanese visitor and falls back to en if ja unsupported elsewhere', () => {
    expect(detectRegionAndLanguage('ja-JP,ja;q=0.9')).toMatchObject({ regionKey: 'JP', language: 'ja' });
    expect(detectRegionAndLanguage('ko-KR')).toEqual({ regionKey: 'UK', language: 'en', source: 'default' });
  });

  it('geo header wins over browser language for region but respects regional languages', () => {
    const result = detectRegionAndLanguage('fr-CA,fr;q=0.9,en;q=0.5', 'US');
    expect(result.regionKey).toBe('US');
    expect(result.language).toBe('en');
  });

  it('parses q-values deterministically for cookie seeding order', () => {
    const tags = parseAcceptLanguage('en;q=0.4, ar-AE;q=0.9, nl;q=0.8');
    expect(tags[0].base).toBe('ar');
    expect(tags.map(t => t.base)).toEqual(['ar', 'nl', 'en']);
  });
});

describe('middleware country subdomain → pod redirect mapping', () => {
  it('routes every European country subdomain to the EU pod', () => {
    for (const sub of ['ie', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'be', 'lu', 'at', 'ch', 'se', 'no', 'dk', 'fi', 'ee', 'lv', 'lt', 'pl', 'cz', 'sk', 'hu', 'ro', 'bg', 'hr', 'si', 'gr', 'cy', 'mt']) {
      expect(resolveCountrySubdomainPod(sub), `${sub}.storegrill.net`).toBe('eu');
    }
  });

  it('routes US and Canada to the US pod', () => {
    expect(resolveCountrySubdomainPod('us')).toBe('us');
    expect(resolveCountrySubdomainPod('ca')).toBe('us');
  });

  it('routes the UK to its own pod and is case-insensitive', () => {
    expect(resolveCountrySubdomainPod('uk')).toBe('uk');
    expect(resolveCountrySubdomainPod('UK')).toBe('uk');
    expect(resolveCountrySubdomainPod('GB')).toBe('uk');
  });

  it('routes UAE/Gulf + India/APAC to the AE pod', () => {
    for (const sub of ['ae', 'sa', 'qa', 'kw', 'bh', 'om', 'in', 'au', 'jp']) {
      expect(resolveCountrySubdomainPod(sub), `${sub}.storegrill.net`).toBe('ae');
    }
  });

  it('routes Africa to NG and GH pods per the agreed split', () => {
    for (const sub of ['ng', 'ke', 'ug', 'tz']) {
      expect(resolveCountrySubdomainPod(sub), `${sub}.storegrill.net`).toBe('ng');
    }
    for (const sub of ['gh', 'za', 'eg', 'ma']) {
      expect(resolveCountrySubdomainPod(sub), `${sub}.storegrill.net`).toBe('gh');
    }
  });

  it('returns null for the EU pod subdomain (not a country code)', () => {
    expect(resolveCountrySubdomainPod('eu')).toBeNull();
  });

  it('returns null for unknown subdomains', () => {
    expect(resolveCountrySubdomainPod('xx')).toBeNull();
    expect(resolveCountrySubdomainPod(null)).toBeNull();
  });
});

describe('middleware apex geo-routing mapping', () => {
  it('routes European visitors to the EU pod', () => {
    expect(resolveApexGeoPod('DE')).toBe('eu');
    expect(resolveApexGeoPod('ie')).toBe('eu');
  });

  it('routes US and Canada to the US pod', () => {
    expect(resolveApexGeoPod('US')).toBe('us');
    expect(resolveApexGeoPod('CA')).toBe('us');
  });

  it('routes UK visitors to the UK pod', () => {
    expect(resolveApexGeoPod('GB')).toBe('uk');
  });

  it('routes Gulf + India/APAC visitors to the AE pod', () => {
    for (const c of ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'IN', 'AU', 'JP', 'NZ']) {
      expect(resolveApexGeoPod(c), c).toBe('ae');
    }
  });

  it('routes Nigerian and Ghanaian visitors to their pods', () => {
    expect(resolveApexGeoPod('NG')).toBe('ng');
    expect(resolveApexGeoPod('GH')).toBe('gh');
  });

  it('returns null for unknown or missing country', () => {
    expect(resolveApexGeoPod('ZZ')).toBeNull();
    expect(resolveApexGeoPod(null)).toBeNull();
    expect(resolveApexGeoPod(undefined)).toBeNull();
  });
});
