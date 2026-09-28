import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  readAddresses,
  serializeAddresses,
  withDefaultFirst,
  assertValidAddress,
  toSaved,
  upsertAddress,
  MAX_SAVED_ADDRESSES,
  type AddressDraft,
} from './addresses.js';

const upsert = vi.hoisted(() => vi.fn());

vi.mock('../db/prisma.js', () => ({
  prisma: { customerProfile: { findUnique: upsert, upsert: vi.fn() } },
}));

const draft = (over: Partial<AddressDraft> = {}): AddressDraft => ({
  label: 'Home',
  street: '221B Baker Street',
  line2: '',
  city: 'London',
  state: '',
  zip: 'NW1 6XE',
  country: 'GB',
  isDefault: false,
  ...over,
});

describe('readAddresses', () => {
  it('returns an empty list for missing or unparseable data', () => {
    expect(readAddresses(null)).toEqual([]);
    expect(readAddresses(undefined)).toEqual([]);
    expect(readAddresses('')).toEqual([]);
    expect(readAddresses('{not json')).toEqual([]);
    expect(readAddresses('{"a":1}')).toEqual([]);
  });

  it('drops legacy rows that no longer parse instead of failing the request', () => {
    const legacy = serializeAddresses([{ id: 'ok', ...draft() } as never]);
    const mixed = JSON.stringify([JSON.parse(legacy)[0], { street: 'no country' }]);
    expect(readAddresses(mixed)).toHaveLength(1);
  });

  it('keeps a stored address intact', () => {
    const stored = { id: 'a1', ...draft({ isDefault: true }) };
    expect(readAddresses(JSON.stringify([stored]))).toEqual([expect.objectContaining({ id: 'a1' })]);
  });
});

describe('withDefaultFirst', () => {
  it('returns nothing for an empty book', () => {
    expect(withDefaultFirst([])).toEqual([]);
  });

  it('promotes the first entry when no default is set', () => {
    const list = [{ id: 'a', ...draft() }, { id: 'b', ...draft() }];
    const result = withDefaultFirst(list);
    expect(result[0].isDefault).toBe(true);
    expect(result[1].isDefault).toBe(false);
  });

  it('moves an existing default to the front and demotes the rest', () => {
    const list = [
      { id: 'a', ...draft({ isDefault: false }) },
      { id: 'b', ...draft({ isDefault: true }) },
    ];
    const result = withDefaultFirst(list);
    expect(result.map(a => a.id)).toEqual(['b', 'a']);
    expect(result.filter(a => a.isDefault)).toHaveLength(1);
  });
});

describe('assertValidAddress', () => {
  it('accepts a valid address', () => {
    expect(() => assertValidAddress(draft())).not.toThrow();
  });

  it('rejects a postcode that does not belong to the country', () => {
    expect(() => assertValidAddress(draft({ zip: '12345' }))).toThrow(/not valid/i);
  });

  it('rejects a missing state where the country needs one', () => {
    expect(() =>
      assertValidAddress(draft({ country: 'US', zip: '94105', state: '' }))
    ).toThrow(/not valid/i);
  });
});

describe('toSaved', () => {
  it('assigns an id when the draft has none', () => {
    expect(toSaved(draft()).id).toEqual(expect.any(String));
  });

  it('preserves an existing id', () => {
    expect(toSaved(draft({ id: 'keep-me' })).id).toBe('keep-me');
  });

  it('uppercases the country', () => {
    expect(toSaved(draft({ country: 'gb' })).country).toBe('GB');
  });
});

describe('upsertAddress', () => {
  it('reports created for a new address', () => {
    const result = upsertAddress([], draft());
    expect(result.created).toBe(true);
    expect(result.list).toHaveLength(1);
    expect(result.list[0].isDefault).toBe(true);
  });

  it('does not duplicate an address the customer already saved', () => {
    const first = upsertAddress([], draft());
    const second = upsertAddress(first.list, draft());
    expect(second.created).toBe(false);
    expect(second.list).toHaveLength(1);
    expect(second.address.id).toBe(first.address.id);
  });

  it('treats a different apartment as a different address', () => {
    const first = upsertAddress([], draft());
    const second = upsertAddress(first.list, draft({ line2: 'Flat 9' }));
    expect(second.created).toBe(true);
    expect(second.list).toHaveLength(2);
  });

  it('ignores case and padding when detecting a duplicate', () => {
    const first = upsertAddress([], draft());
    const second = upsertAddress(first.list, draft({ street: '  221b BAKER street ' }));
    expect(second.created).toBe(false);
  });

  it('keeps the default flag off a newly added address', () => {
    const first = upsertAddress([], draft());
    const second = upsertAddress(first.list, draft({ street: '2 Other Road' }));
    expect(second.list.filter(a => a.isDefault)).toHaveLength(1);
    expect(second.list[0].isDefault).toBe(true);
  });

  it('refuses to grow past the address book limit', () => {
    const full = Array.from({ length: MAX_SAVED_ADDRESSES }, (_, i) => ({
      id: `a${i}`,
      ...draft({ street: `Street ${i}` }),
    }));
    expect(() => upsertAddress(full, draft({ street: 'One Too Many' }))).toThrow(/up to 10/i);
  });
});

describe('loadAddresses', () => {
  beforeEach(() => upsert.mockReset());

  it('defaults the first entry when stored data has no default', async () => {
    upsert.mockResolvedValue({ shippingAddresses: JSON.stringify([{ id: 'a', ...draft() }]) });
    const { loadAddresses } = await import('./addresses.js');
    const list = await loadAddresses('user-1');
    expect(list[0].isDefault).toBe(true);
  });
});
