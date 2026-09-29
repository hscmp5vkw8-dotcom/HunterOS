import { defineConfig, devices } from '@playwright/test';

// The server only serves a local export. Every account/API call is intercepted
// by the spec; these checks never create users or send a real message.
export default defineConfig({
  testDir: './tests',
  testMatch: 'messages-web.spec.ts',
  timeout: 45000,
  retries: 0,
  workers: 1,
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    baseURL: 'http://127.0.0.1:4174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve-web.mjs',
    env: { PORT: '4174', WEB_ROOT: process.env.HUNTEROS_TEST_WEB_ROOT || 'dist' },
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 10000,
  },
});
