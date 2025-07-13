import { test, expect } from '@playwright/test';

// Ortam değişkeninden al, yoksa yerelde dfx komutuyla oku
const FRONTEND_URL = process.env.FRONTEND_URL ??
  `http://127.0.0.1:8000/?canisterId=${
    require('child_process')
      .execSync('dfx canister id onescrt_frontend')
      .toString()
      .trim()
  }`;

test.describe('onescrt UI flow', () => {
  test.beforeEach(async ({ page }) => {
    // Artık tam URL’e gidiyoruz
    await page.goto(FRONTEND_URL, { waitUntil: 'load' });
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
