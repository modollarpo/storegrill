import { test, expect } from '@playwright/test';

test.describe('Vendor Portal', () => {
  test('Vendor can access login page and dashboard', async ({ page }) => {
    // Block third-party hosts so navigation is never blocked by external resources
    await page.route(/^(?!http:\/\/localhost)/, route => route.abort());

    // Navigate to Vendor Portal (runs on port 3003)
    await page.goto('http://localhost:3003', { waitUntil: 'domcontentloaded' });

    // Middleware redirects unauthenticated visitors to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    // Wait out dev-mode hydration so the submit handler is attached before typing
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeEnabled();

    // Full login round-trip with a seeded seller account
    await page.fill('input[type="email"]', 'vendor1@storegrill.net');
    await page.fill('input[type="password"]', 'Password123');
    await Promise.all([
      page.waitForURL(u => !u.pathname.includes('login'), { timeout: 20000 }),
      page.getByRole('button', { name: /Sign in/i }).click(),
    ]);

    // Successful login lands on the vendor dashboard
    await expect(page).toHaveURL(/\/(\?.*)?$/, { timeout: 20000 });
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });
});
