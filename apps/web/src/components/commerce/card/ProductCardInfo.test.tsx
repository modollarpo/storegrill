import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ProductCardInfo } from './ProductCardInfo';
import type { ProductCardData } from '../ProductCard';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const base: ProductCardData = {
  id: 'p1',
  name: 'Wireless Headphones',
  slug: 'wireless-headphones',
  price: 2999,
  listPrice: 4999,
  currencyCode: 'USD',
  rating: 4,
  reviewCount: 12,
  vendor: { storeName: 'Vendor', slug: 'vendor' },
};

function prices(ui: React.ReactElement): string {
  const { container } = render(ui);
  return container.querySelector('.mt-auto')?.textContent ?? '';
}

describe('ProductCardInfo pricing', () => {
  it('shows the active deal price alongside the struck-through original price and discount badge', () => {
    const text = prices(<ProductCardInfo product={base} href="/products/wireless-headphones" locale="en-US" />);
    expect(text).toContain('$29.99');
    expect(text).toContain('$49.99');
    expect(text).toContain('-40%');
  });

  it('omits the original price and badge when there is no discount', () => {
    const noDiscount: ProductCardData = { ...base, listPrice: 2999 };
    const text = prices(<ProductCardInfo product={noDiscount} href="/products/wireless-headphones" locale="en-US" />);
    expect(text).toContain('$29.99');
    expect(text).not.toContain('$49.99');
    expect(text).not.toContain('%');
  });

  it('treats a list price equal to the current price as no discount', () => {
    const equal: ProductCardData = { ...base, listPrice: 2999 };
    const text = prices(<ProductCardInfo product={equal} href="/products/wireless-headphones" locale="en-US" />);
    expect(text).not.toContain('$49.99');
    expect(text).not.toMatch(/%/);
  });
});
