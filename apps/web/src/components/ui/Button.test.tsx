import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button').textContent).toBe('Click me');
  });

  it('applies primary variant class by default', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button').className).toContain('btn-primary');
  });

  it('applies variant class when specified', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button').className).toContain('btn-danger');
  });

  it('applies size class when specified', () => {
    render(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button').className).toContain('btn-lg');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button').getAttribute('disabled')).toBe('');
  });

  it('is disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button').getAttribute('disabled')).toBe('');
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
  });

  it('shows spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button').querySelector('span[aria-hidden="true"]')).toBeTruthy();
  });

  it('renders as link when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );
    const wrapper = screen.getByRole('presentation');
    expect(wrapper.querySelector('a')).toBeTruthy();
  });
});
