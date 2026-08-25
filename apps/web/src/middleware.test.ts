import { describe, expect, it } from 'vitest';
import { detectRegionAndLanguage, parseAcceptLanguage } from '@Storegrill/shared';

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
