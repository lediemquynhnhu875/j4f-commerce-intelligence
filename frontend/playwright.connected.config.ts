import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/connected", fullyParallel: false, workers: 1, timeout: 60000,
  reporter: "list", outputDir: "../tmp/frontend-connected", use: { baseURL: "http://127.0.0.1:3101", trace: "off", video: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: { command: "npm run start -- --hostname 127.0.0.1 --port 3101", url: "http://127.0.0.1:3101", reuseExistingServer: false,
    env: { BACKEND_API_URL: process.env.CONNECTED_BACKEND_API_URL ?? "http://127.0.0.1:3002/api/v1" }, timeout: 30000 },
});
