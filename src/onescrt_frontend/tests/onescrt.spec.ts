import { test, expect } from '@playwright/test';

test.describe('onescrt UI flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Submit and Retrieve Secret', async ({ page }) => {
    const input  = page.locator('#secretInput');
    const submit = page.locator('#submitBtn');
    const get    = page.locator('#getBtn');
    const resp   = page.locator('#responseBox');

    await input.fill('Playwright Test Secret');
    await submit.click();
    await expect(resp).toHaveText('✅ Secret submitted!');

    await get.click();
    await expect(resp).toContainText('🔐 Playwright Test Secret');
  });
});
