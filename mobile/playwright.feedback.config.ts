import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'feedback-update-web.spec.ts',outputDir:'test-results/feedback-update',timeout:45000,retries:0,workers:1,
 projects:[{name:'mobile',use:{...devices['iPhone 13']}},{name:'desktop',use:{viewport:{width:1280,height:800}}}],
 use:{browserName:'chromium',channel:process.env.PLAYWRIGHT_CHANNEL||(process.platform==='win32'?'chrome':undefined),baseURL:'http://127.0.0.1:4176',screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'node scripts/serve-web.mjs',env:{PORT:'4176',WEB_ROOT:process.env.HUNTEROS_FEEDBACK_WEB_ROOT||'dist-feedback-test'},url:'http://127.0.0.1:4176',reuseExistingServer:false,timeout:10000}});
