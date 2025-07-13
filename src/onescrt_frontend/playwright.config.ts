import { defineConfig, devices } from '@playwright/test';

// CI/CD’de aşağıdaki env değişkeni ile atanacak.
// Yerelde test ediyorsanız default olarak `http://127.0.0.1:8000` kullanır.
const baseURL = process.env.FRONTEND_URL ?? 'http://127.0.0.1:8000';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    headless: true,
    baseURL,              // <<< burada dinamik baseURL
    viewport: { width: 480, height: 800 },
    actionTimeout: 10_000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
