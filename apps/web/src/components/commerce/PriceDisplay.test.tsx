import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PriceDisplay } from './PriceDisplay';

function textOf(ui: React.ReactElement): string {
  const { container } = render(ui);
  return container.textContent ?? '';
}

describe('PriceDisplay', () => {
  it('formats USD minor units with split whole/fraction', () => {
    const text = textOf(<PriceDisplay amountMinorUnits={3599} currencyCode="USD" />);
    expect(text).toContain('35');
    expect(text).toContain('99');
    expect(text).toContain('$');
  });

  it('renders zero-decimal JPY without fraction', () => {
    const text = textOf(<PriceDisplay amountMinorUnits={1500} currencyCode="JPY" />);
    expect(text).toContain('1,500');
    expect(text).not.toMatch(/\.\d/);
  });

  it('never accepts floats — 1000 minor units renders whole=10, fraction=.00', () => {
    const { container } = render(<PriceDisplay amountMinorUnits={1000} currencyCode="EUR" />);
    const parts = Array.from(container.querySelectorAll('span[aria-hidden="true"]')).map(s => s.textContent);
    expect(parts[1]).toBe('10');
    expect(parts[2]).toBe('.00');
    expect(textOf(<PriceDisplay amountMinorUnits={1000000} currencyCode="EUR" />)).toContain('10,000');
  });

  it('renders decimal point between whole and fraction — 29999 shows $299.99', () => {
    const text = textOf(<PriceDisplay amountMinorUnits={29999} currencyCode="USD" />);
    expect(text).toContain('$299.99');
    expect(text).not.toContain('$29999');
  });

  it('groups thousands with commas — 123456789 shows $1,234,567.89', () => {
    const text = textOf(<PriceDisplay amountMinorUnits={123456789} currencyCode="USD" />);
    expect(text).toContain('$1,234,567.89');
  });

  it('shows strikethrough list price when higher than current', () => {
    const text = textOf(<PriceDisplay amountMinorUnits={2999} currencyCode="USD" listMinorUnits={4999} />);
    expect(text).toContain('$49.99');
  });

  it('exposes accessible aria-label for screen readers', () => {
    const { getByRole } = render(<PriceDisplay amountMinorUnits={999} currencyCode="USD" locale="en-US" />);
    expect(getByRole('text').getAttribute('aria-label')).toBeTruthy();
  });

  it('formats SEK and GBP correctly across locales', () => {
    expect(textOf(<PriceDisplay amountMinorUnits={1050} currencyCode="SEK" />)).toContain('10');
    expect(textOf(<PriceDisplay amountMinorUnits={2050} currencyCode="GBP" />)).toContain('20');
  });
});
