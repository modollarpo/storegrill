import { describe, expect, it } from 'vitest';
import { resolveRegionFromHost } from './server-context';

describe('resolveRegionFromHost', () => {
  it('resolves pod subdomains to region keys', () => {
    expect(resolveRegionFromHost('uk.storegrill.net')).toBe('UK');
    expect(resolveRegionFromHost('us.storegrill.net')).toBe('US');
    expect(resolveRegionFromHost('ae.storegrill.net')).toBe('AE');
    expect(resolveRegionFromHost('ng.storegrill.net')).toBe('NG');
  });

  it('resolves country subdomains regardless of case', () => {
    expect(resolveRegionFromHost('DE.storegrill.net')).toBe('DE');
    expect(resolveRegionFromHost('fr.Storegrill.net')).toBe('FR');
    expect(resolveRegionFromHost('ca.storegrill.net')).toBe('CA');
    expect(resolveRegionFromHost('NZ.storegrill.net')).toBeNull();
  });

  it('returns null for apex, www and non-matching hosts', () => {
    expect(resolveRegionFromHost('storegrill.net')).toBeNull();
    expect(resolveRegionFromHost('www.storegrill.net')).toBeNull();
    expect(resolveRegionFromHost('eu.storegrill.net')).toBeNull();
    expect(resolveRegionFromHost('localhost:3000')).toBeNull();
    expect(resolveRegionFromHost('')).toBeNull();
  });
});