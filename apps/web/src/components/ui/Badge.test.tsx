import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, CounterBadge } from './Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New').textContent).toBe('New');
  });

  it('applies neutral variant by default', () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText('Test').className).toContain('bg-smoke-100');
  });

  it('applies variant class when specified', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active').className).toContain('bg-feedback-success-bg');
  });

  it('renders dot when dot prop is true', () => {
    render(<Badge dot>With dot</Badge>);
    expect(screen.getByText('With dot').querySelector('span[aria-hidden="true"]')).toBeTruthy();
  });

  it('renders pulse animation when pulse is true', () => {
    render(<Badge dot pulse>Pulsing</Badge>);
    const dot = screen.getByText('Pulsing').querySelector('.animate-ping');
    expect(dot).toBeTruthy();
  });

  it('applies size class when specified', () => {
    render(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium').className).toContain('text-xs');
  });
});

describe('CounterBadge', () => {
  it('renders count', () => {
    render(<CounterBadge count={5} />);
    const el = document.querySelector('[role="status"]');
    expect(el).toBeTruthy();
    expect(el!.textContent).toBe('5');
  });

  it('returns null when count is 0 and showZero is false', () => {
    const { container } = render(<CounterBadge count={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders zero when showZero is true', () => {
    render(<CounterBadge count={0} showZero />);
    const el = document.querySelector('[role="status"]');
    expect(el!.textContent).toBe('0');
  });

  it('caps at max with + suffix', () => {
    render(<CounterBadge count={150} max={99} />);
    const el = document.querySelector('[role="status"]');
    expect(el!.textContent).toBe('99+');
  });

  it('applies placement class', () => {
    render(<CounterBadge count={1} placement="bottom-left" />);
    const el = document.querySelector('[role="status"]');
    expect(el!.className).toContain('-bottom-1.5');
    expect(el!.className).toContain('-left-2');
  });

  it('has aria-label when provided', () => {
    render(<CounterBadge count={3} aria-label="3 items in cart" />);
    const el = document.querySelector('[role="status"]');
    expect(el!.getAttribute('aria-label')).toBe('3 items in cart');
  });
});
