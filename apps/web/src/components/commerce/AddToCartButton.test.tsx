import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddToCartButton } from './AddToCartButton';
import { ToastProvider } from '../feedback/Toast';
import { CartProvider, useCart } from '../providers/CartContext';
import { useStore } from '@/lib/store';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));

function CartProbe() {
  const cart = useCart();
  return <span data-testid="probe">{cart.count}:{cart.items[0]?.name ?? 'empty'}</span>;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <CartProvider>
        {ui}
        <CartProbe />
      </CartProvider>
    </ToastProvider>
  );
}

const baseProps = {
  productId: 'p1',
  name: 'Test Product',
  unitPriceMinorUnits: 2500,
  currencyCode: 'USD',
};

describe('AddToCartButton', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ cartLines: [], favorites: [] });
  });

  it('adds item to cart context', () => {
    renderWithProviders(<AddToCartButton {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));
    expect(screen.getByTestId('probe').textContent).toBe('1:Test Product');
  });

  it('increments quantity when clicked twice', () => {
    renderWithProviders(<AddToCartButton {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));
    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));
    expect(screen.getByTestId('probe').textContent?.startsWith('2:')).toBe(true);
  });

  it('renders Notify Me for out-of-stock and does not add', () => {
    renderWithProviders(<AddToCartButton {...baseProps} stock={0} />);
    expect(screen.queryByRole('button', { name: /add to cart/i })).toBeNull();
    expect(screen.getByRole('button', { name: /notify me/i })).toBeTruthy();
    expect(screen.getByTestId('probe').textContent).toBe('0:empty');
  });

  it('buy now mode adds to cart and routes to checkout', () => {
    push.mockClear();
    renderWithProviders(<AddToCartButton {...baseProps} mode="buynow" />);
    fireEvent.click(screen.getByRole('button', { name: /buy now/i }));
    expect(screen.getByTestId('probe').textContent).toBe('1:Test Product');
    expect(push).toHaveBeenCalledWith('/checkout');
  });
});
