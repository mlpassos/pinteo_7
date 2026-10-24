import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

/** E2E sobre o build real, com API/dados/portas exclusivos da verificação de release. */
export default defineConfig({
  ...base,
  testMatch: 'product.spec.ts',
  outputDir: 'test-results/release',
  retries: 0,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5190' },
  webServer: [
    {
      command: 'node scripts/test-api.mjs --release',
      url: 'http://127.0.0.1:5198/api/health',
      reuseExistingServer: false,
    },
    {
      command: 'npm run preview -- --config vite.release.config.ts',
      url: 'http://127.0.0.1:5190',
      reuseExistingServer: false,
    },
  ],
});
