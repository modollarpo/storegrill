import { describe, it, expect } from 'vitest';
import { generateCsrfToken, validateCsrfToken } from './csrf.js';

describe('validateCsrfToken', () => {
  it('accepts a freshly generated token', () => {
    expect(validateCsrfToken(generateCsrfToken())).toBe(true);
  });

  it('rejects a token whose payload was tampered with', () => {
    const token = generateCsrfToken();
    const [raw, sig] = token.split('.');
    const tampered = `${raw.replace(/^./, c => (c === 'a' ? 'b' : 'a'))}.${sig}`;
    expect(validateCsrfToken(tampered)).toBe(false);
  });

  it('rejects a token with no signature instead of throwing', () => {
    expect(() => validateCsrfToken('deadbeef')).not.toThrow();
    expect(validateCsrfToken('deadbeef')).toBe(false);
  });

  it('rejects a truncated signature without throwing on a length mismatch', () => {
    const token = generateCsrfToken();
    const [raw, sig] = token.split('.');
    expect(() => validateCsrfToken(`${raw}.${sig.slice(0, 8)}`)).not.toThrow();
    expect(validateCsrfToken(`${raw}.${sig.slice(0, 8)}`)).toBe(false);
  });

  it('rejects an over-long signature without throwing on a length mismatch', () => {
    const token = generateCsrfToken();
    const [raw, sig] = token.split('.');
    expect(() => validateCsrfToken(`${raw}.${sig}ff`)).not.toThrow();
    expect(validateCsrfToken(`${raw}.${sig}ff`)).toBe(false);
  });

  it('rejects empty and malformed values', () => {
    for (const value of ['', '.', 'a.', '.b', 'nodot']) {
      expect(() => validateCsrfToken(value)).not.toThrow();
      expect(validateCsrfToken(value)).toBe(false);
    }
  });
});
