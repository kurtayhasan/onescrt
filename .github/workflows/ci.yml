import { defineConfig, devices } from '@playwright/test';

// Eğer FRONTEND_URL env değişkeni set edilmişse onu, yoksa fallback olarak:
// http://127.0.0.1:8000/?canisterId=<your-local-id>
const baseURL = process.env.FRONTEND_URL ?? 
  `http://127.0.0.1:8000/?canisterId=${require('child_process')
    .execSync('dfx canister id onescrt_frontend').toString().trim()}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    headless: true,
    baseURL,
    viewport: { width: 480, height: 800 },
    actionTimeout: 10_000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
