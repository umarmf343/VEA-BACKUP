import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./playwright/tests",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "true"
      ? undefined
      : {
          command: process.env.CI ? "npm run dev" : "npm run dev -- --hostname 0.0.0.0",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
})
