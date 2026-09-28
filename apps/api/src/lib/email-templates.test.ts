import { describe, it, expect } from 'vitest';
import { formatAddress } from './email-templates.js';

describe('formatAddress', () => {
  it('renders the canonical checkout address shape', () => {
    const address = JSON.stringify({
      street: '10 Downing Street',
      line2: 'Flat 4',
      city: 'London',
      state: 'Greater London',
      zip: 'SW1A 2AA',
      country: 'GB',
    });
    expect(formatAddress(address)).toBe(
      '10 Downing Street, Flat 4, London, Greater London, SW1A 2AA, GB'
    );
  });

  it('omits empty optional parts instead of leaving gaps', () => {
    const address = JSON.stringify({
      street: 'Kalverstraat 1',
      line2: '',
      city: 'Amsterdam',
      state: '',
      zip: '1012',
      country: 'NL',
    });
    expect(formatAddress(address)).toBe('Kalverstraat 1, Amsterdam, 1012, NL');
  });

  it('reads the legacy line1/county/postcode keys', () => {
    const address = JSON.stringify({
      line1: '1 Legacy Road',
      city: 'Dublin',
      county: 'Leinster',
      postcode: 'D02',
      country: 'IE',
    });
    expect(formatAddress(address)).toBe('1 Legacy Road, Dublin, Leinster, D02, IE');
  });

  it('falls back when the payload is unusable', () => {
    expect(formatAddress('not json')).toBe('Address on account');
    expect(formatAddress('{}')).toBe('Address on account');
  });
});
