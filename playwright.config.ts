import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5180', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'npm run build:api && node scripts/test-api.mjs',
      url: 'http://127.0.0.1:5178/api/health',
      reuseExistingServer: false,
    },
    { command: 'npm run dev', url: 'http://127.0.0.1:5180', reuseExistingServer: !process.env.CI },
  ],
});
