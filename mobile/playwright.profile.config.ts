import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests',testMatch:'profile-web.spec.ts',outputDir:'test-results/profile-runs',timeout:45000,retries:0,workers:1,
  use:{...devices['iPhone 13'],browserName:'chromium',channel:process.env.PLAYWRIGHT_CHANNEL||(process.platform==='win32'?'chrome':undefined),baseURL:'http://127.0.0.1:4175',screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'node scripts/serve-web.mjs',env:{PORT:'4175',WEB_ROOT:'dist-profile-test'},url:'http://127.0.0.1:4175',reuseExistingServer:process.env.HUNTEROS_REUSE_LOCAL_SERVER==='1',timeout:10000},
});
