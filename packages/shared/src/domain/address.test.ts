import { describe, it, expect } from 'vitest';
import {
  validateAddress,
  addressIssuesByField,
  formatAddressLines,
  AddressSchema,
  SavedAddressSchema,
} from './address.js';
import { postalCodePatternFor, postalRuleFor } from './postal-rules.js';

const validUk = {
  street: '221B Baker Street',
  line2: 'Flat 3',
  city: 'London',
  state: '',
  zip: 'NW1 6XE',
  country: 'GB',
};

describe('validateAddress', () => {
  it('accepts a well-formed address for a country with a known postcode format', () => {
    expect(validateAddress(validUk)).toEqual({ ok: true, issues: [] });
  });

  it('rejects a postcode that cannot be valid for the chosen country', () => {
    const result = validateAddress({ ...validUk, zip: 'NOT-A-POSTCODE' });
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({ field: 'zip', code: 'badPostcode' });
  });

  it('accepts the same postcode that one country rejects in another', () => {
    expect(validateAddress({ ...validUk, country: 'DE', zip: '10115' }).ok).toBe(true);
    expect(validateAddress({ ...validUk, country: 'DE', zip: 'NW1 6XE' }).ok).toBe(false);
  });

  it('requires a state for countries that have one', () => {
    const result = validateAddress({
      street: '1 Market Street',
      city: 'San Francisco',
      state: '',
      zip: '94105',
      country: 'US',
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({ field: 'state', code: 'stateRequired' });

    expect(validateAddress({
      street: '1 Market Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'US',
    }).ok).toBe(true);
  });

  it('does not require a state for countries without one', () => {
    expect(validateAddress({ ...validUk, state: '', country: 'NL', zip: '1012 AB' }).ok).toBe(true);
  });

  it('skips the postcode check for countries that issue none', () => {
    const dubai = { street: 'Sheikh Zayed Road', city: 'Dubai', state: '', zip: '', country: 'AE' };
    expect(validateAddress(dubai).ok).toBe(true);
  });

  it('treats the postcode as optional where the country mixes them', () => {
    expect(validateAddress({ ...validUk, country: 'BW', zip: '' }).ok).toBe(true);
  });

  it('rejects a street or city that is too short to be real', () => {
    expect(validateAddress({ ...validUk, street: 'ab' }).ok).toBe(false);
    expect(validateAddress({ ...validUk, city: 'L' }).ok).toBe(false);
  });

  it('rejects a country that is not an ISO 3166-1 alpha-2 code', () => {
    const result = validateAddress({ ...validUk, country: 'GBR' });
    expect(result.issues).toContainEqual({ field: 'country', code: 'badCountry' });
  });

  it('normalises case and surrounding whitespace before judging', () => {
    expect(validateAddress({ ...validUk, street: '  221b baker street  ', zip: 'nw1 6xe' }).ok).toBe(true);
  });

  it('keeps an apartment line out of the state field entirely', () => {
    const parsed = AddressSchema.parse({
      street: '10 Downing Street',
      line2: 'Apartment 4B',
      city: 'London',
      country: 'gb',
    });
    expect(parsed.line2).toBe('Apartment 4B');
    expect(parsed.state).toBe('');
    expect(parsed.country).toBe('GB');
  });
});

describe('addressIssuesByField', () => {
  it('reports one code per field for form rendering', () => {
    const map = addressIssuesByField(validateAddress({ ...validUk, zip: 'nope', country: 'DE' }));
    expect(map.zip).toBe('badPostcode');
    expect(map.street).toBeUndefined();
  });
});

describe('formatAddressLines', () => {
  it('emits street, apartment, city+state and postcode in order', () => {
    expect(formatAddressLines({ ...validUk, state: 'Greater London' })).toEqual([
      '221B Baker Street',
      'Flat 3',
      'London, Greater London',
      'NW1 6XE',
    ]);
  });

  it('omits empty optional parts', () => {
    expect(formatAddressLines({ ...validUk, line2: '', state: '', zip: 'NW1 6XE' })).toEqual([
      '221B Baker Street',
      'London',
      'NW1 6XE',
    ]);
  });
});

describe('SavedAddressSchema', () => {
  it('requires an id on a stored address', () => {
    expect(SavedAddressSchema.safeParse(validUk).success).toBe(false);
    expect(SavedAddressSchema.safeParse({ ...validUk, id: 'a1' }).success).toBe(true);
  });
});

describe('postalCodePatternFor', () => {
  it('returns null for a country with no postcode system', () => {
    expect(postalCodePatternFor('AE')).toBeNull();
  });

  it('is case-insensitive and anchored', () => {
    const pattern = postalCodePatternFor('GB')!;
    expect(pattern.test('NW1 6XE')).toBe(true);
    expect(pattern.test('nw1 6xe')).toBe(true);
    expect(pattern.test('!!1 6XE')).toBe(false);
    expect(pattern.test('NW1')).toBe(false);
    expect(pattern.test('NW1 6XEX')).toBe(false);
  });

  it('falls back to a permissive rule for an unknown country', () => {
    expect(postalRuleFor('ZZ').zipOptional).toBe(true);
    expect(validateAddress({ ...validUk, country: 'ZZ', zip: 'anything' }).ok).toBe(true);
  });
});
