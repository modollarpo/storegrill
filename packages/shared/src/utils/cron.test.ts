import { describe, it, expect } from 'vitest';
import { isCronDue } from './cron';

function at(minute: number, hour: number, day?: number, month?: number, year?: number): Date {
  return new Date(year ?? 2026, (month ?? 1) - 1, day ?? 4, hour, minute, 0, 0);
}

describe('isCronDue', () => {
  it('matches a fixed daily time', () => {
    expect(isCronDue('0 3 * * *', at(0, 3))).toBe(true);
    expect(isCronDue('0 3 * * *', at(1, 3))).toBe(false);
    expect(isCronDue('0 3 * * *', at(0, 4))).toBe(false);
  });

  it('matches step expressions', () => {
    expect(isCronDue('*/15 * * * *', at(0, 5))).toBe(true);
    expect(isCronDue('*/15 * * * *', at(15, 5))).toBe(true);
    expect(isCronDue('*/15 * * * *', at(16, 5))).toBe(false);
  });

  it('matches lists and ranges', () => {
    expect(isCronDue('0,30 * * * *', at(30, 7))).toBe(true);
    expect(isCronDue('0 9-17 * * *', at(0, 12))).toBe(true);
    expect(isCronDue('0 9-17 * * *', at(0, 8))).toBe(false);
  });

  it('respects weekday and month fields', () => {
    const monday = at(0, 3, 3, 8, 2026);
    const tuesday = at(0, 3, 4, 8, 2026);
    expect(monday.getDay()).toBe(1);
    expect(tuesday.getDay()).toBe(2);
    expect(isCronDue('0 3 * * 1', monday)).toBe(true);
    expect(isCronDue('0 3 * * 1', tuesday)).toBe(false);
    expect(isCronDue('0 3 3 8 *', monday)).toBe(true);
    expect(isCronDue('0 3 1 9 *', monday)).toBe(false);
  });

  it('treats 7 as sunday and rejects malformed expressions', () => {
    const sunday = at(0, 12, 2, 8, 2026);
    expect(sunday.getDay()).toBe(0);
    expect(isCronDue('0 12 * * 7', sunday)).toBe(true);
    expect(isCronDue('not-a-cron', sunday)).toBe(false);
    expect(isCronDue('* * * *', sunday)).toBe(false);
  });
});
