import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should render correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', { fullPage: true });
  });
});

test.describe('Product Listing', () => {
  test('should render product grid', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveScreenshot('products-grid.png', { fullPage: true });
  });

  test('should render filters', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    await expect(page).toHaveScreenshot('products-filters.png');
  });
});

test.describe('Cart', () => {
  test('should render empty cart', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveScreenshot('cart-empty.png');
  });
});

test.describe('Checkout', () => {
  test('should render checkout steps', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveScreenshot('checkout.png');
  });
});

test.describe('Deals', () => {
  test('should render deals page', async ({ page }) => {
    await page.goto('/deals');
    await expect(page).toHaveScreenshot('deals.png', { fullPage: true });
  });
});

test.describe('Vendors', () => {
  test('should render vendors page', async ({ page }) => {
    await page.goto('/vendors');
    await expect(page).toHaveScreenshot('vendors.png', { fullPage: true });
  });
});
