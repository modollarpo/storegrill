import { describe, expect, it, beforeEach } from 'vitest';
import { MAX_COMPARE, useCompareStore } from './useCompareStore';

const reset = () => useCompareStore.setState({ productIds: [] });

describe('useCompareStore', () => {
  beforeEach(reset);

  it('adds and removes a product', () => {
    expect(useCompareStore.getState().toggleProduct('p1')).toBe('added');
    expect(useCompareStore.getState().productIds).toEqual(['p1']);

    expect(useCompareStore.getState().toggleProduct('p1')).toBe('removed');
    expect(useCompareStore.getState().productIds).toEqual([]);
  });

  it('reports a refused addition instead of silently dropping it', () => {
    for (let i = 0; i < MAX_COMPARE; i++) {
      expect(useCompareStore.getState().toggleProduct(`p${i}`)).toBe('added');
    }

    expect(useCompareStore.getState().toggleProduct('overflow')).toBe('at-limit');
    expect(useCompareStore.getState().productIds).toHaveLength(MAX_COMPARE);
    expect(useCompareStore.getState().productIds).not.toContain('overflow');
  });

  it('still allows a removal after the limit is reached', () => {
    for (let i = 0; i < MAX_COMPARE; i++) useCompareStore.getState().toggleProduct(`p${i}`);

    expect(useCompareStore.getState().removeProduct('p0')).toBeUndefined();
    expect(useCompareStore.getState().productIds).toHaveLength(MAX_COMPARE - 1);
    expect(useCompareStore.getState().toggleProduct('overflow')).toBe('added');
  });

  it('never stores duplicates', () => {
    useCompareStore.getState().toggleProduct('p1');
    useCompareStore.getState().toggleProduct('p2');
    useCompareStore.getState().toggleProduct('p1');

    expect(useCompareStore.getState().productIds).toEqual(['p2']);
  });

  it('clears every selection', () => {
    useCompareStore.getState().toggleProduct('p1');
    useCompareStore.getState().toggleProduct('p2');
    useCompareStore.getState().clearCompare();
    expect(useCompareStore.getState().productIds).toEqual([]);
  });
});
