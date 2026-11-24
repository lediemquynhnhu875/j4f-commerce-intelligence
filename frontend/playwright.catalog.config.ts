import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/catalog',workers:1,timeout:60000,reporter:'list',
  outputDir:'../tmp/catalog-pagination',
  use:{baseURL:'http://127.0.0.1:3103',trace:'off',video:'off'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run dev -- --hostname 127.0.0.1 --port 3103',url:'http://127.0.0.1:3103/login',reuseExistingServer:true,timeout:60000},
});
