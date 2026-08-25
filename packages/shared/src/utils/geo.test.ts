import { describe, expect, it } from 'vitest';
import {
  detectRegionAndLanguage,
  parseAcceptLanguage,
  resolveRegionForCountry,
} from './geo';

describe('parseAcceptLanguage', () => {
  it('returns empty array for missing header', () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
  });

  it('parses simple tags', () => {
    expect(parseAcceptLanguage('en-US,en;q=0.9')).toEqual([
      { tag: 'en-us', base: 'en', q: 1 },
      { tag: 'en', base: 'en', q: 0.9 },
    ]);
  });

  it('sorts by descending quality value', () => {
    const result = parseAcceptLanguage('de;q=0.7,en-US;q=0.9,fr');
    expect(result.map(t => t.tag)).toEqual(['fr', 'en-us', 'de']);
  });

  it('drops malformed entries', () => {
    expect(parseAcceptLanguage(',,en')).toEqual([{ tag: 'en', base: 'en', q: 1 }]);
  });
});

describe('resolveRegionForCountry', () => {
  it('maps known countries case-insensitively', () => {
    expect(resolveRegionForCountry('us')).toBe('US');
    expect(resolveRegionForCountry('DE')).toBe('DE');
    expect(resolveRegionForCountry('gb')).toBe('UK');
    expect(resolveRegionForCountry('in')).toBe('IN');
    expect(resolveRegionForCountry('AE')).toBe('AE');
    expect(resolveRegionForCountry('JP')).toBe('JP');
  });

  it('maps African countries to their launch regions', () => {
    expect(resolveRegionForCountry('NG')).toBe('NG');
    expect(resolveRegionForCountry('ke')).toBe('KE');
    expect(resolveRegionForCountry('ZA')).toBe('ZA');
    expect(resolveRegionForCountry('GH')).toBe('GH');
    expect(resolveRegionForCountry('UG')).toBe('UG');
    expect(resolveRegionForCountry('TZ')).toBe('TZ');
    expect(resolveRegionForCountry('EG')).toBe('EG');
    expect(resolveRegionForCountry('MA')).toBe('MA');
    expect(resolveRegionForCountry('EH')).toBe('MA');
    expect(resolveRegionForCountry('BW')).toBe('ZA');
    expect(resolveRegionForCountry('NA')).toBe('ZA');
  });

  it('returns null for unmapped or missing countries', () => {
    expect(resolveRegionForCountry('XX')).toBeNull();
    expect(resolveRegionForCountry(undefined)).toBeNull();
    expect(resolveRegionForCountry(null)).toBeNull();
  });
});

describe('detectRegionAndLanguage', () => {
  it('uses geo country over language when both available', () => {
    const result = detectRegionAndLanguage('fr-FR,fr;q=0.9,en;q=0.8', 'US');
    expect(result.regionKey).toBe('US');
    expect(result.language).toBe('en');
    expect(result.source).toBe('geo');
  });

  it('falls back to accept-language region when no geo header', () => {
    const result = detectRegionAndLanguage('de-DE,de;q=0.9,en;q=0.8');
    expect(result.regionKey).toBe('DE');
    expect(result.language).toBe('de');
    expect(result.source).toBe('accept-language');
  });

  it('maps African languages to their regions via accept-language', () => {
    expect(detectRegionAndLanguage('sw-KE,sw;q=0.9,en;q=0.5').regionKey).toBe('KE');
    expect(detectRegionAndLanguage('yo-NG,en;q=0.6').regionKey).toBe('NG');
    expect(detectRegionAndLanguage('af-ZA,en;q=0.7').regionKey).toBe('ZA');
  });

  it('defaults to UK/en when nothing matches', () => {
    const result = detectRegionAndLanguage('zh-CN,zh;q=0.9');
    expect(result).toEqual({ regionKey: 'UK', language: 'en', source: 'default' });
    expect(detectRegionAndLanguage(undefined, undefined)).toEqual({
      regionKey: 'UK',
      language: 'en',
      source: 'default',
    });
  });

  it('keeps region default language when browser language unsupported in region', () => {
    const result = detectRegionAndLanguage('ja-JP,ja;q=0.9', 'IN');
    expect(result.regionKey).toBe('IN');
    expect(result.language).toBe('en');
  });

  it('picks the best supported regional language from preferences', () => {
    const result = detectRegionAndLanguage('hi-IN,hi;q=0.9,en;q=0.5', 'IN');
    expect(result.language).toBe('hi');
  });

  it('maps arabic browsers to AE region with arabic language', () => {
    const result = detectRegionAndLanguage('ar-AE,ar;q=0.9,en;q=0.5');
    expect(result.regionKey).toBe('AE');
    expect(result.language).toBe('ar');
  });
});
