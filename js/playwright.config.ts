import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npx http-server .. -p 4173 -c-1 --silent',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
