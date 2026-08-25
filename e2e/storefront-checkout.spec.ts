import { test, expect } from '@playwright/test';

test.describe('Storefront Checkout Flow', () => {
  test('User can browse products, change region, and add to cart', async ({ page }) => {
    // Block third-party hosts (seed placeholder images) so navigation isn't blocked
    await page.route(/^(?!http:\/\/localhost)/, route => route.abort());

    // 1. Visit homepage
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

    // Check that title matches StoreGrill
    await expect(page).toHaveTitle(/StoreGrill/i);

    // 2. Header renders (region picker lives inside it)
    await expect(page.locator('header').first()).toBeVisible();

    // 3. Open the first product from the homepage grid
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await firstProduct.waitFor();
    await firstProduct.click();

    // 4. On PDP, add to cart
    const addToCartBtn = page.getByRole('button', { name: /Add to basket/i }).first();
    await addToCartBtn.waitFor();
    await addToCartBtn.click();

    // 5. Proceed straight to checkout via Buy Now
    const buyNowBtn = page.getByRole('button', { name: /Buy Now/i }).first();
    await expect(buyNowBtn).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/checkout/, { timeout: 20000 }),
      buyNowBtn.click(),
    ]);

    // 6. Verify we land on checkout
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('text=Deliver to').first()).toBeVisible();
  });
});
